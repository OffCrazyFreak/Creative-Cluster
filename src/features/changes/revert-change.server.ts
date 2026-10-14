import { dequal } from "dequal";
import { and, eq } from "drizzle-orm";

import { LOCALES } from "@/constants/locales";
import type { Tx } from "@/db/client.server";
import { db } from "@/db/client.server";
import { changeLog, entry, user } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { isRevertibleField } from "@/features/review/entry-fields";
import { pageLink } from "@/lib/auth/auth-email.server";
import { translatedTextChanged } from "@/features/account/save-own-listing.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
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
// A group (for example the location) is restored whole or not at all, so a half-stripped row
// never leaves a city without its coordinates. A field that was edited again since is left alone,
// so reverting an old change never discards a newer one.
function restorableFields(log: LogRow, current?: EntryRow): string[] {
  const before = log.before ?? {};
  const after = log.after ?? {};
  const changed = log.changedFields.filter(isRevertibleField);
  const blocked = new Set(
    changed
      .filter(
        (field) =>
          !(field in before) ||
          (current !== undefined &&
            !(
              field in after &&
              dequal(current[field as keyof EntryRow], after[field])
            )),
      )
      .map(revertFieldGroup),
  );
  return changed.filter(
    (field) => field in before && !blocked.has(revertFieldGroup(field)),
  );
}

function isRevertibleLog(log: LogRow, current?: EntryRow): boolean {
  return (
    log.entityType === "entry" &&
    current !== undefined &&
    // A listing queued for deletion is frozen; restoring old personal data would undo that.
    current.erasureRequestedAt === null &&
    log.action === "update" &&
    log.revertedByLogId === null &&
    restorableFields(log, current).length > 0
  );
}

function diffsOf(log: LogRow, current: EntryRow | undefined): IFieldDiff[] {
  const restorable = new Set(restorableFields(log, current));
  return log.changedFields.map((field) => ({
    field,
    before: text((log.before ?? {})[field]),
    current: text(current?.[field as keyof EntryRow]),
    restorable: restorable.has(field),
  }));
}

export async function getChangeDetail(id: string): Promise<IChangeDetail> {
  const [found] = await db
    .select({ log: changeLog, current: entry, ...changeSelect })
    .from(changeLog)
    .leftJoin(
      entry,
      and(eq(changeLog.entityType, "entry"), eq(entry.id, changeLog.entityId)),
    )
    .leftJoin(user, eq(user.id, changeLog.userId))
    .where(eq(changeLog.id, id))
    .limit(1);
  if (!found) throw new NotFoundError();
  const current = found.current ?? undefined;
  return {
    row: toChangeRow(found),
    revertible: isRevertibleLog(found.log, current),
    diffs: diffsOf(found.log, current),
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
    if (!log || log.entityType !== "entry") return "not_revertible" as const;
    const [listing] = await tx
      .select()
      .from(entry)
      .where(eq(entry.id, log.entityId))
      .limit(1)
      .for("update");
    if (!listing || !isRevertibleLog(log, listing))
      return "not_revertible" as const;

    const fields = restorableFields(log, listing);
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
    if (
      translatedTextChanged(fields, listing, {
        extra: listing.extra,
        ...restored,
      })
    )
      await enqueueTranslation(tx, {
        entityType: "entry",
        entityId: listing.id,
      });
    await mailOwner(tx, listing, fields, reason, row.id);
    return "ok" as const;
  });
  if (result === "ok") invalidateMapDirectory();
  return { status: result };
}
