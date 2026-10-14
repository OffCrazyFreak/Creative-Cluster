import { and, eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, reviewItem } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { NotFoundError } from "@/server/errors";

import type { ReportReason } from "@/constants/review";

interface ICreateReport {
  entryId: string;
  reason: ReportReason;
  message: string;
}

// Only listings a visitor can see can be reported. Nothing is hidden automatically: an admin decides.
export async function createReport(input: ICreateReport) {
  const [row] = await db
    .select({ id: entry.id })
    .from(entry)
    .where(and(eq(entry.id, input.entryId), publicEntryCondition()))
    .limit(1);
  if (!row) throw new NotFoundError();
  await db.insert(reviewItem).values({
    type: "report",
    entityType: "entry",
    entityId: row.id,
    payload: { reason: input.reason, message: input.message },
  });
}
