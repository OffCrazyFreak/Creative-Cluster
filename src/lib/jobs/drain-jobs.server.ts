import { and, asc, eq, inArray, lt, or, lte, sql } from "drizzle-orm";

import { JOB_MAX_ATTEMPTS, type JobType } from "@/constants/jobs";
import { db } from "@/db/client.server";
import { job } from "@/db/schema";

import "./job-handlers.server";
import { backoffMs } from "./job-backoff";
import {
  PermanentJobError,
  jobHandlerFor,
  registeredJobTypes,
  type IJobContext,
} from "./job-registry.server";

const BATCH_SIZE = 10;
// Longer than a background function may run (15 minutes), so a live drain never loses its job.
const STALE_LOCK_MS = 20 * 60 * 1000;

export interface IDrainResult {
  done: number;
  retried: number;
  failed: number;
  deferred: number;
}

// SKIP LOCKED lets overlapping drains (save-triggered and scheduled) never take the same job.
function claimBatch(now: Date, types: ReturnType<typeof registeredJobTypes>) {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  const claimable = db
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
  return db
    .update(job)
    .set({
      status: "running",
      lockedAt: now,
      attempts: sql`${job.attempts} + 1`,
    })
    .where(inArray(job.id, claimable))
    .returning();
}

type ClaimedJob = Awaited<ReturnType<typeof claimBatch>>[number];

// Jobs claimed but not started when time runs out go back without losing an attempt.
async function releaseJobs(rows: ClaimedJob[]) {
  await db
    .update(job)
    .set({
      status: "queued",
      lockedAt: null,
      attempts: sql`${job.attempts} - 1`,
    })
    .where(
      inArray(
        job.id,
        rows.map((row) => row.id),
      ),
    );
}

function isErasureDone(payload: unknown) {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "template" in payload &&
    payload.template === "erasure_done"
  );
}

async function runJob(row: ClaimedJob, result: IDrainResult, deadline: number) {
  const handler = jobHandlerFor(row.type);
  const context: IJobContext = {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    priority: row.priority,
    attempts: row.attempts,
    deadline,
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
    const exhausted =
      error instanceof PermanentJobError || row.attempts >= JOB_MAX_ATTEMPTS;
    try {
      await db
        .update(job)
        .set({
          status: exhausted ? "failed" : "queued",
          error: message,
          lockedAt: null,
          runAt: new Date(Date.now() + backoffMs(row.attempts)),
          // The address of a deleted account must not stay in the outbox when its last mail gave up.
          ...(exhausted && isErasureDone(row.payload)
            ? { payload: { template: "erasure_done", scrubbed: true } }
            : {}),
        })
        .where(eq(job.id, row.id));
    } catch (updateError) {
      // The stale-lock reclaim picks the job up later; one bad write must not strand the batch.
      console.error("could not record a job failure", row.id, updateError);
    }
    if (exhausted) result.failed += 1;
    else result.retried += 1;
  }
}

// True when a job of one of these types is waiting to run now.
export async function hasDueJobs(types: readonly JobType[]) {
  const [row] = await db
    .select({ id: job.id })
    .from(job)
    .where(
      and(
        inArray(job.type, [...types]),
        eq(job.status, "queued"),
        lte(job.runAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export interface IDrainOptions {
  skipTypes?: readonly JobType[];
}

export async function drainJobs(
  maxMs = 20_000,
  { skipTypes = [] }: IDrainOptions = {},
): Promise<IDrainResult> {
  const result: IDrainResult = { done: 0, retried: 0, failed: 0, deferred: 0 };
  const types = registeredJobTypes().filter((t) => !skipTypes.includes(t));
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const batch = await claimBatch(new Date(), types);
    if (batch.length === 0) break;
    for (const [index, row] of batch.entries()) {
      if (Date.now() >= deadline) {
        await releaseJobs(batch.slice(index));
        break;
      }
      await runJob(row, result, deadline);
    }
  }
  return result;
}
