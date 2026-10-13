import { dequal } from "dequal";

import type { DbOrTx } from "@/db/client.server";
import { changeLog } from "@/db/schema";
import type {
  ChangeAction,
  ChangeSource,
  ModeratedEntity,
} from "@/constants/moderation";

// Callers pass before and after in the same shape (both from the database or both from input).
export interface IWriteChange {
  entityType: ModeratedEntity;
  entityId: string;
  userId: string | null;
  source: ChangeSource;
  action: ChangeAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  revertedByLogId?: string;
}

function changedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  return [...keys].filter((key) => !dequal(before?.[key], after?.[key]));
}

export async function writeChange(tx: DbOrTx, input: IWriteChange) {
  const [row] = await tx
    .insert(changeLog)
    .values({
      ...input,
      before: input.before ?? null,
      after: input.after ?? null,
      changedFields: changedFields(input.before, input.after),
    })
    .returning({ id: changeLog.id });
  return row;
}
