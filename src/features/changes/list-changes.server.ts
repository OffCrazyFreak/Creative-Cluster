import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { CHANGES_PAGE_SIZE } from "@/constants/review";
import { db } from "@/db/client.server";
import { changeLog, entry, user } from "@/db/schema";

import type {
  ChangesListInput,
  IChangeRow,
  IChangesPage,
} from "./changes-schemas";

export function toChangeRow(row: {
  id: string;
  createdAt: Date;
  entityType: IChangeRow["entityType"];
  entityId: string;
  entryName: string | null;
  actorName: string | null;
  source: IChangeRow["source"];
  action: IChangeRow["action"];
  changedFields: string[];
  revertedByLogId: string | null;
}): IChangeRow {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    entityType: row.entityType,
    entityId: row.entityId,
    label: row.entryName ?? row.entityId,
    actor: row.actorName,
    source: row.source,
    action: row.action,
    changedFields: row.changedFields,
    reverted: row.revertedByLogId !== null,
  };
}

function filters(input: ChangesListInput): SQL | undefined {
  const conditions: SQL[] = [];
  if (input.entityType)
    conditions.push(eq(changeLog.entityType, input.entityType));
  if (input.source) conditions.push(eq(changeLog.source, input.source));
  if (input.action) conditions.push(eq(changeLog.action, input.action));
  if (input.entityId) conditions.push(eq(changeLog.entityId, input.entityId));
  return conditions.length ? and(...conditions) : undefined;
}

export const changeSelect = {
  id: changeLog.id,
  createdAt: changeLog.createdAt,
  entityType: changeLog.entityType,
  entityId: changeLog.entityId,
  entryName: entry.name,
  actorName: user.name,
  source: changeLog.source,
  action: changeLog.action,
  changedFields: changeLog.changedFields,
  revertedByLogId: changeLog.revertedByLogId,
};

export async function listChanges(
  input: ChangesListInput,
): Promise<IChangesPage> {
  const where = filters(input);
  const [rows, [total]] = await Promise.all([
    db
      .select(changeSelect)
      .from(changeLog)
      .leftJoin(
        entry,
        and(
          eq(changeLog.entityType, "entry"),
          eq(entry.id, changeLog.entityId),
        ),
      )
      .leftJoin(user, eq(user.id, changeLog.userId))
      .where(where)
      .orderBy(desc(changeLog.createdAt), desc(changeLog.id))
      .limit(CHANGES_PAGE_SIZE)
      .offset((input.page - 1) * CHANGES_PAGE_SIZE),
    db.select({ total: count() }).from(changeLog).where(where),
  ]);
  return {
    rows: rows.map(toChangeRow),
    total: total?.total ?? 0,
    pageSize: CHANGES_PAGE_SIZE,
  };
}
