import { and, eq } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import { entry, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { pickRevertible } from "./entry-fields";

interface ISubmitUntrustedEdit {
  entryId: string;
  userId: string;
  changes: Record<string, unknown>;
}

// For the owner edit service: when entry.trusted is false it calls this instead of updating the entry.
// The proposed values wait in the review item and go live only when an admin approves.
export async function submitUntrustedEdit(tx: Tx, input: ISubmitUntrustedEdit) {
  const changes = pickRevertible(input.changes);
  const [item] = await tx
    .insert(reviewItem)
    .values({
      type: "untrusted_edit",
      entityType: "entry",
      entityId: input.entryId,
      payload: { changes, submittedBy: input.userId },
    })
    .returning({ id: reviewItem.id });
  return item.id;
}

interface IApplyUntrustedEdit {
  itemId: string;
  entryId: string;
  adminId: string;
  payload: Record<string, unknown>;
}

export async function applyUntrustedEdit(tx: Tx, input: IApplyUntrustedEdit) {
  const rawChanges = input.payload.changes;
  const changes = pickRevertible(
    typeof rawChanges === "object" && rawChanges !== null
      ? (rawChanges as Record<string, unknown>)
      : {},
  );
  const [row] = await tx
    .select()
    .from(entry)
    .where(and(eq(entry.id, input.entryId), eq(entry.status, "published")))
    .limit(1)
    .for("update");
  if (!row) throw new NotFoundError();

  const before = Object.fromEntries(
    Object.keys(changes).map((key) => [key, row[key as keyof typeof row]]),
  );
  await tx
    .update(entry)
    .set(changes as Partial<typeof entry.$inferInsert>)
    .where(eq(entry.id, row.id));
  await tx
    .update(reviewItem)
    .set({
      status: "approved",
      decidedBy: input.adminId,
      decidedAt: new Date(),
    })
    .where(eq(reviewItem.id, input.itemId));
  const submittedBy = input.payload.submittedBy;
  await writeChange(tx, {
    entityType: "entry",
    entityId: row.id,
    userId: typeof submittedBy === "string" ? submittedBy : null,
    source: "owner",
    action: "update",
    before,
    after: changes,
  });
}
