import { sql } from "drizzle-orm";

import { db, type DbOrTx } from "@/db/client.server";
import { usageCounter } from "@/db/schema";
import { LimitError } from "@/server/errors";

export interface ILimit {
  key: string;
  max: number;
  windowSeconds: number;
}

// Fixed-window counter in one upsert: a new window resets the count atomically.
export async function hitLimit(
  { key, max, windowSeconds }: ILimit,
  conn: DbOrTx = db,
): Promise<boolean> {
  const expired = sql`${usageCounter.windowStart} < now() - make_interval(secs => ${windowSeconds})`;
  const [row] = await conn
    .insert(usageCounter)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: usageCounter.key,
      set: {
        count: sql`case when ${expired} then 1 else ${usageCounter.count} + 1 end`,
        windowStart: sql`case when ${expired} then now() else ${usageCounter.windowStart} end`,
      },
    })
    .returning({ count: usageCounter.count });
  return (row?.count ?? 0) <= max;
}

export async function enforceLimits(limits: ILimit[], conn: DbOrTx = db) {
  for (const limit of limits) {
    if (!(await hitLimit(limit, conn))) throw new LimitError();
  }
}
