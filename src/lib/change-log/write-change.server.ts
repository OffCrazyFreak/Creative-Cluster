import type { DbOrTx } from "@/db/client.server";
import { changeLog } from "@/db/schema";
import type { ChangeAction, ChangeSource } from "@/constants/moderation";

export interface IWriteChange {
  entityType: "entry" | "opportunity" | "link" | "tag" | "user";
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
  return [...keys].filter(
    (key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]),
  );
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
