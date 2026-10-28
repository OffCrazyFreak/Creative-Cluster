import { and, eq, gte, ne, or, sql } from "drizzle-orm";

import { EMAIL_SOFT_CAP_RATIO, EMAIL_PRIORITY } from "@/constants/email";
import { db } from "@/db/client.server";
import { env } from "@/env.server";
import { job } from "@/db/schema";

export function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function startOfNextUtcDay(now: Date): Date {
  const next = startOfUtcDay(now);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

// Mail being sent by an overlapping drain counts too, or both would pass the cap check. The rest of this
// drain's batch shares this job's lock time and runs one by one after it, so it is not in flight yet.
export async function countSentToday(
  now: Date,
  excludeJobId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(job)
    .where(
      and(
        eq(job.type, "email"),
        ne(job.id, excludeJobId),
        or(
          and(
            eq(job.status, "running"),
            sql`${job.lockedAt} is distinct from (select locked_at from job where id = ${excludeJobId})`,
          ),
          eq(job.status, "done"),
        ),
        gte(job.updatedAt, startOfUtcDay(now)),
      ),
    );
  return row?.count ?? 0;
}

// Resend's free tier is 100 a day: urgent mail may use all of it, the rest stops at the soft cap.
export function maySend(
  priority: number,
  sentToday: number,
  cap: number = env.EMAIL_DAILY_CAP,
): boolean {
  if (priority <= EMAIL_PRIORITY.urgent) return sentToday < cap;
  return sentToday < Math.floor(cap * EMAIL_SOFT_CAP_RATIO);
}
