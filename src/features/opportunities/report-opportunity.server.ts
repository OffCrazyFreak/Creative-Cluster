import { eq } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db/client.server";
import { entry, opportunity, reviewItem } from "@/db/schema";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import {
  TurnstileError,
  verifyTurnstile,
} from "@/lib/turnstile/verify-turnstile.server";
import { LimitError, NotFoundError } from "@/server/errors";
import { clientIp } from "@/server/request.server";

import type { reportOpportunityInput } from "./opportunity-page-schemas";
import { pageStateOf } from "./opportunity-page-state";

export type ReportResult = { status: "sent" | "captcha" | "limited" };

type ReportInput = z.output<typeof reportOpportunityInput>;

// Nothing is hidden automatically: an admin decides from the queue.
export async function reportOpportunity(
  input: ReportInput,
): Promise<ReportResult> {
  // A filled honeypot gets the same answer as success, so a bot learns nothing.
  if (input.fax) return { status: "sent" };
  try {
    await verifyTurnstile(input.turnstileToken);
  } catch (error) {
    if (error instanceof TurnstileError) return { status: "captcha" };
    throw error;
  }
  const [row] = await db
    .select({
      id: opportunity.id,
      status: opportunity.status,
      closedReason: opportunity.closedReason,
      closedAt: opportunity.closedAt,
      expiresAt: opportunity.expiresAt,
      entryStatus: entry.status,
    })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(eq(opportunity.id, input.id))
    .limit(1);
  // Only posts a visitor can open can be reported; dead or unknown ids cost nothing and leave no counter rows.
  const state = row && pageStateOf(row, row.entryStatus, new Date());
  if (!row || !["active", "expired", "filled"].includes(state ?? ""))
    throw new NotFoundError();
  try {
    await enforceLimits([
      { key: `opp-report:ip:${clientIp()}`, max: 5, windowSeconds: 3600 },
      // One visitor cannot flood a post, and several visitors cannot lock each other out of reporting it.
      {
        key: `opp-report:post:${input.id}:${clientIp()}`,
        max: 2,
        windowSeconds: 86_400,
      },
    ]);
  } catch (error) {
    if (error instanceof LimitError) return { status: "limited" };
    throw error;
  }
  await db.insert(reviewItem).values({
    type: "report",
    entityType: "opportunity",
    entityId: row.id,
    payload: { message: input.message },
  });
  return { status: "sent" };
}
