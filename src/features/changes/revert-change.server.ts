import { and, eq } from "drizzle-orm";

import { LOCALES } from "@/constants/locales";
import type { Tx } from "@/db/client.server";
import { db } from "@/db/client.server";
import { changeLog, entry, user } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { isRevertibleField } from "@/features/review/entry-fields";
import { pageLink } from "@/lib/auth/auth-email.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { NotFoundError } from "@/server/errors";
import { site } from "@/sites";

import { toChangeRow, changeSelect } from "./list-changes.server";
import type {
  IChangeDetail,
  IFieldDiff,
  RevertResult,
} from "./changes-schemas";
import { revertFieldGroup } from "./revert-field-groups";

type LogRow = typeof changeLog.$inferSelect;
type EntryRow = typeof entry.$inferSelect;

function text(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

// Only fields that still have a stored "before" can be restored: old rows lose personal fields.
function restorableFields(log: LogRow): string[] {
  const before = log.before ?? {};
  return log.changedFields.filter(
    (field) => isRevertibleField(field) && field in before,
  );
}

function isRevertibleLog(log: LogRow): boolean {
  return (
    log.entityType === "entry" &&
    log.action === "update" &&
    log.revertedByLogId === null &&
    restorableFields(log).length > 0
  );
}

function diffsOf(log: LogRow, current: EntryRow | undefined): IFieldDiff[] {
  const restorable = new Set(restorableFields(log));
  return log.changedFields.map((field) => ({
    field,
    before: text((log.before ?? {})[field]),
    current: text(current?.[field as keyof EntryRow]),
    restorable: restorable.has(field),
  }));
}

export async function getChangeDetail(id: string): Promise<IChangeDetail> {
  const [log] = await db
    .select()
    .from(changeLog)
    .where(eq(changeLog.id, id))
    .limit(1);
  if (!log) throw new NotFoundError();
  const [row] = await db
    .select(changeSelect)
    .from(changeLog)
    .leftJoin(
      entry,
      and(eq(changeLog.entityType, "entry"), eq(entry.id, changeLog.entityId)),
    )
    .leftJoin(user, eq(user.id, changeLog.userId))
    .where(eq(changeLog.id, id))
    .limit(1);
  const [current] =
    log.entityType === "entry"
      ? await db.select().from(entry).where(eq(entry.id, log.entityId)).limit(1)
      : [];
  return {
    row: toChangeRow(row),
    revertible: isRevertibleLog(log),
    diffs: diffsOf(log, current),
  };
}

async function mailOwner(
  tx: Tx,
  listing: EntryRow,
  fields: string[],
  reason: string,
  revertLogId: string,
) {
  if (!listing.ownerUserId) return;
  const [owner] = await tx
    .select({ email: user.email, locale: user.locale })
    .from(user)
    .where(eq(user.id, listing.ownerUserId))
    .limit(1);
  if (!owner) return;
  const locale = LOCALES.find((l) => l === owner.locale) ?? site.baseLocale;
  await enqueueEmail(tx, {
    template: "edit_reverted",
    to: owner.email,
    props: {
      locale,
      entryName: listing.name,
      fieldGroups: [...new Set(fields.map(revertFieldGroup))],
      reason,
      link: pageLink("/account/listing", locale),
    },
    idempotencyKey: `edit-reverted:${revertLogId}`,
  });
}

// Restores entry columns only (tags, links and other entities are untouched) and records the undo as a new row.
export async function revertChange(
  id: string,
  reason: string,
  adminId: string,
): Promise<RevertResult> {
  const result = await db.transaction(async (tx) => {
    const [log] = await tx
      .select()
      .from(changeLog)
      .where(eq(changeLog.id, id))
      .limit(1)
      .for("update");
    if (!log || !isRevertibleLog(log)) return "not_revertible" as const;
    const [listing] = await tx
      .select()
      .from(entry)
      .where(eq(entry.id, log.entityId))
      .limit(1)
      .for("update");
    if (!listing) return "not_revertible" as const;

    const fields = restorableFields(log);
    const restored = Object.fromEntries(
      fields.map((field) => [field, (log.before ?? {})[field]]),
    );
    const current = Object.fromEntries(
      fields.map((field) => [field, listing[field as keyof EntryRow]]),
    );
    await tx.update(entry).set(restored).where(eq(entry.id, listing.id));
    const row = await writeChange(tx, {
      entityType: "entry",
      entityId: listing.id,
      userId: adminId,
      source: "admin",
      action: "revert",
      before: current,
      after: restored,
    });
    await tx
      .update(changeLog)
      .set({ revertedByLogId: row.id })
      .where(eq(changeLog.id, log.id));
    await mailOwner(tx, listing, fields, reason, row.id);
    return "ok" as const;
  });
  if (result === "ok") invalidateMapDirectory();
  return { status: result };
}
