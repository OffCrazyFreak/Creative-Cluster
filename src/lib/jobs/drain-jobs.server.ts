import { and, asc, eq, inArray, lt, or, lte } from "drizzle-orm";

import { JOB_MAX_ATTEMPTS } from "@/constants/jobs";
import { db } from "@/db/client.server";
import { job } from "@/db/schema";

import "./job-handlers.server";
import {
  jobHandlerFor,
  registeredJobTypes,
  type IJobContext,
} from "./job-registry.server";

const BATCH_SIZE = 10;
// A job still "running" after this long belongs to a function that died.
const STALE_LOCK_MS = 10 * 60 * 1000;
const BACKOFF_BASE_MS = 30_000;

export interface IDrainResult {
  done: number;
  retried: number;
  failed: number;
  deferred: number;
}

export function backoffMs(attempts: number): number {
  return BACKOFF_BASE_MS * 4 ** Math.max(0, attempts - 1);
}

// SKIP LOCKED lets overlapping drains (save-triggered and scheduled) never take the same job.
async function claimBatch(
  now: Date,
  types: ReturnType<typeof registeredJobTypes>,
) {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  return db.transaction(async (tx) => {
    const candidates = await tx
      .select({ id: job.id })
      .from(job)
      .where(
        and(
          inArray(job.type, types),
          or(
            and(eq(job.status, "queued"), lte(job.runAt, now)),
            and(eq(job.status, "running"), lt(job.lockedAt, staleBefore)),
          ),
        ),
      )
      .orderBy(asc(job.priority), asc(job.runAt))
      .limit(BATCH_SIZE)
      .for("update", { skipLocked: true });
    if (candidates.length === 0) return [];
    const ids = candidates.map((row) => row.id);
    const rows = await tx.select().from(job).where(inArray(job.id, ids));
    for (const row of rows) {
      await tx
        .update(job)
        .set({ status: "running", lockedAt: now, attempts: row.attempts + 1 })
        .where(eq(job.id, row.id));
    }
    return rows.map((row) => ({ ...row, attempts: row.attempts + 1 }));
  });
}

type ClaimedJob = Awaited<ReturnType<typeof claimBatch>>[number];

async function runJob(row: ClaimedJob, result: IDrainResult) {
  const handler = jobHandlerFor(row.type);
  const context: IJobContext = {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    priority: row.priority,
    attempts: row.attempts,
  };
  try {
    const outcome = await handler!(row.payload, context);
    if (outcome && "deferUntil" in outcome) {
      await db
        .update(job)
        .set({
          status: "queued",
          runAt: outcome.deferUntil,
          attempts: row.attempts - 1,
          lockedAt: null,
        })
        .where(eq(job.id, row.id));
      result.deferred += 1;
      return;
    }
    await db
      .update(job)
      .set({ status: "done", error: null, lockedAt: null })
      .where(eq(job.id, row.id));
    result.done += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = row.attempts >= JOB_MAX_ATTEMPTS;
    await db
      .update(job)
      .set({
        status: exhausted ? "failed" : "queued",
        error: message,
        lockedAt: null,
        runAt: new Date(Date.now() + backoffMs(row.attempts)),
      })
      .where(eq(job.id, row.id));
    if (exhausted) result.failed += 1;
    else result.retried += 1;
  }
}

export async function drainJobs(maxMs = 20_000): Promise<IDrainResult> {
  const result: IDrainResult = { done: 0, retried: 0, failed: 0, deferred: 0 };
  const types = registeredJobTypes();
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const batch = await claimBatch(new Date(), types);
    if (batch.length === 0) break;
    for (const row of batch) await runJob(row, result);
  }
  return result;
}
