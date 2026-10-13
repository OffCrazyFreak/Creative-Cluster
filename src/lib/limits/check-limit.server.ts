import { sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { usageCounter } from "@/db/schema";
import { LimitError } from "@/server/errors";

export interface ILimit {
  key: string;
  max: number;
  windowSeconds: number;
}

// Fixed-window counter in one upsert: a new window resets the count atomically.
export async function hitLimit({
  key,
  max,
  windowSeconds,
}: ILimit): Promise<boolean> {
  const expired = sql`${usageCounter.windowStart} < now() - make_interval(secs => ${windowSeconds})`;
  const [row] = await db
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

export async function enforceLimits(limits: ILimit[]) {
  for (const limit of limits) {
    if (!(await hitLimit(limit))) throw new LimitError();
  }
}
