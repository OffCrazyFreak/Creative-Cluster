import { and, eq } from "drizzle-orm";

import type { ReasonCode } from "@/constants/moderation";
import { NOTE_REQUIRED_REASON_CODES } from "@/constants/review";
import { db, type Tx } from "@/db/client.server";
import { reviewItem } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { decideSuggestion } from "@/features/tags/decide-suggestion.server";
import { NotFoundError } from "@/server/errors";

import { approveApplication } from "./approve-application.server";
import { rejectApplication } from "./reject-application.server";
import type {
  DecideOutcome,
  DecideReviewInput,
  IDecideResult,
} from "./review-schemas";
import { applyUntrustedEdit } from "./untrusted-edit.server";

type Item = typeof reviewItem.$inferSelect;

interface IDecision {
  decision: DecideReviewInput["decision"];
  reasonCode?: ReasonCode;
  note: string | null;
  adminId: string;
}

// Reports have no "reject": the admin either acted on the listing ("approve") or dismisses the report.
async function closeItem(tx: Tx, item: Item, decision: IDecision) {
  await tx
    .update(reviewItem)
    .set({
      status: decision.decision === "approve" ? "approved" : "dismissed",
      decidedBy: decision.adminId,
      decidedAt: new Date(),
    })
    .where(eq(reviewItem.id, item.id));
}

async function rejectOrDismissEdit(tx: Tx, item: Item, decision: IDecision) {
  await tx
    .update(reviewItem)
    .set({
      status: "rejected",
      reasonCode: decision.reasonCode,
      noteToApplicant: decision.note,
      decidedBy: decision.adminId,
      decidedAt: new Date(),
    })
    .where(eq(reviewItem.id, item.id));
}

async function decideInTx(
  tx: Tx,
  item: Item,
  decision: IDecision,
): Promise<DecideOutcome> {
  const { adminId } = decision;
  if (item.type === "application") {
    if (decision.decision === "approve") {
      await approveApplication(tx, {
        itemId: item.id,
        entryId: item.entityId,
        adminId,
      });
      return "ok";
    }
    const { reasonCode, note } = decision;
    if (!reasonCode) return "failed";
    if (NOTE_REQUIRED_REASON_CODES.includes(reasonCode) && !note)
      return "failed";
    await rejectApplication(tx, {
      itemId: item.id,
      entryId: item.entityId,
      adminId,
      reasonCode,
      note,
    });
    return "ok";
  }
  if (item.type === "untrusted_edit") {
    if (decision.decision === "approve")
      await applyUntrustedEdit(tx, {
        itemId: item.id,
        entryId: item.entityId,
        adminId,
        payload: item.payload,
      });
    else await rejectOrDismissEdit(tx, item, decision);
    return "ok";
  }
  if (item.type === "report") {
    await closeItem(tx, item, decision);
    return "ok";
  }
  return "unsupported";
}

async function decideOne(
  id: string,
  decision: IDecision,
): Promise<DecideOutcome> {
  const [peek] = await db
    .select()
    .from(reviewItem)
    .where(and(eq(reviewItem.id, id), eq(reviewItem.status, "open")))
    .limit(1);
  if (!peek) return "gone";

  // The tag service runs its own transaction and also closes the item.
  if (peek.type === "tag") {
    await decideSuggestion({
      tagId: peek.entityId,
      decision: decision.decision,
      adminId: decision.adminId,
    });
    return "ok";
  }
  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(reviewItem)
      .where(and(eq(reviewItem.id, id), eq(reviewItem.status, "open")))
      .limit(1)
      .for("update");
    return item ? decideInTx(tx, item, decision) : "gone";
  });
}

// Each item is its own transaction: one failure in a bulk run never blocks the others.
export async function decideReviewItems(
  input: DecideReviewInput,
  adminId: string,
): Promise<IDecideResult[]> {
  const decision: IDecision = {
    decision: input.decision,
    reasonCode: input.reasonCode,
    note: input.note || null,
    adminId,
  };
  const results: IDecideResult[] = [];
  for (const id of input.ids) {
    let outcome: DecideOutcome;
    try {
      outcome = await decideOne(id, decision);
    } catch (error) {
      if (error instanceof NotFoundError) outcome = "gone";
      else {
        console.error("review decision failed", id, error);
        outcome = "failed";
      }
    }
    results.push({ id, outcome });
  }
  // Publishing, edits and tag rejections change what the map shows.
  invalidateMapDirectory();
  return results;
}
