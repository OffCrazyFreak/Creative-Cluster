import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, opportunity, reviewItem } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import {
  TurnstileError,
  verifyTurnstile,
} from "@/lib/turnstile/verify-turnstile.server";
import { LimitError, NotFoundError } from "@/server/errors";
import { clientIp } from "@/server/request.server";

import type { z } from "zod";

import type { reportOpportunityInput } from "./opportunity-page-schemas";

export type ReportResult = { status: "ok" | "captcha" | "limited" };

type ReportInput = z.output<typeof reportOpportunityInput>;

// Nothing is hidden automatically: an admin decides from the queue.
export async function reportOpportunity(
  input: ReportInput,
): Promise<ReportResult> {
  // A filled honeypot gets the same answer as success, so a bot learns nothing.
  if (input.fax) return { status: "ok" };
  try {
    await verifyTurnstile(input.turnstileToken);
  } catch (error) {
    if (error instanceof TurnstileError) return { status: "captcha" };
    throw error;
  }
  try {
    await enforceLimits([
      { key: `opp-report:ip:${clientIp()}`, max: 5, windowSeconds: 3600 },
      { key: `opp-report:post:${input.id}`, max: 10, windowSeconds: 86_400 },
    ]);
  } catch (error) {
    if (error instanceof LimitError) return { status: "limited" };
    throw error;
  }
  const [row] = await db
    .select({ id: opportunity.id })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(
      and(
        eq(opportunity.id, input.id),
        inArray(opportunity.status, ["published", "closed"]),
        publicEntryCondition(),
      ),
    )
    .limit(1);
  if (!row) throw new NotFoundError();
  await db.insert(reviewItem).values({
    type: "report",
    entityType: "opportunity",
    entityId: row.id,
    payload: { message: input.message },
  });
  return { status: "ok" };
}
