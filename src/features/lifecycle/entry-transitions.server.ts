import { and, eq, inArray } from "drizzle-orm";

import type { EntryStatus } from "@/constants/entry";
import type { ChangeSource } from "@/constants/moderation";
import type { Tx } from "@/db/client.server";
import { entry } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

export interface IActor {
  userId: string | null;
  source: ChangeSource;
}

export type EntryRow = typeof entry.$inferSelect;

interface ITransition {
  entryId: string;
  from: EntryStatus[];
  to: EntryStatus;
  patch?: Partial<typeof entry.$inferInsert>;
  actor: IActor;
  // Extra ownership condition, kept in the same statement as the lock (missing and not yours look alike).
  ownerUserId?: string;
}

// The one place an entry changes status: lock, check the source status, update, log, all in the caller's transaction.
export async function transitionEntry(
  tx: Tx,
  input: ITransition,
): Promise<EntryRow> {
  const conditions = [
    eq(entry.id, input.entryId),
    inArray(entry.status, input.from),
  ];
  if (input.ownerUserId)
    conditions.push(eq(entry.ownerUserId, input.ownerUserId));
  const [row] = await tx
    .select()
    .from(entry)
    .where(and(...conditions))
    .limit(1)
    .for("update");
  if (!row) throw new NotFoundError();

  const patch = input.patch ?? {};
  await tx
    .update(entry)
    .set({ status: input.to, ...patch })
    .where(eq(entry.id, row.id));
  await writeChange(tx, {
    entityType: "entry",
    entityId: row.id,
    ...input.actor,
    action: "status_change",
    before: { status: row.status, suspendedReason: row.suspendedReason },
    after: {
      status: input.to,
      suspendedReason:
        "suspendedReason" in patch
          ? (patch.suspendedReason ?? null)
          : row.suspendedReason,
    },
  });
  return { ...row, status: input.to, ...patch };
}
