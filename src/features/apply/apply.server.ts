import { dequal } from "dequal";
import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import {
  APPLY_VERIFY_EXPIRY,
  APPLY_VERIFY_TTL_SECONDS,
} from "@/constants/apply";
import type { AppLocale } from "@/constants/locales";
import { db, type Tx } from "@/db/client.server";
import { entry, reviewItem } from "@/db/schema";
import { allocateSlug } from "@/features/entry/slug.server";
import { pageLink } from "@/lib/auth/auth-email.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { detectSourceLocale } from "@/lib/translation/detect-locale";
import { NotFoundError } from "@/server/errors";

import { applicationEntryFields } from "./apply-entry-fields";
import type {
  ApplicationInput,
  SubmitApplicationResult,
} from "./apply-schemas";
import {
  entryIdForToken,
  issueApplicationToken,
  revokeApplicationTokens,
  tokenDigest,
} from "./application-tokens.server";

export const DRAFT_SLUG_PREFIX = "draft-";

const LOGGED_FIELDS = [
  "kind",
  "name",
  "descriptionText",
  "website",
  "contactName",
  "contactEmail",
  "contactPhone",
  "city",
  "countryCode",
  "addressText",
  "onlineOnly",
] as const;

function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  return LOGGED_FIELDS.filter((key) => !dequal(before[key], after[key]));
}

function pickFields(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key] ?? null]));
}

async function queueVerification(
  tx: Tx,
  entryId: string,
  email: string,
  entryName: string,
  locale: AppLocale,
) {
  const token = await issueApplicationToken(
    tx,
    "apply-verify",
    entryId,
    APPLY_VERIFY_TTL_SECONDS,
  );
  await enqueueEmail(tx, {
    template: "verify",
    to: email,
    props: {
      locale,
      link: pageLink(
        `/apply/verify?token=${encodeURIComponent(token)}`,
        locale,
      ),
      expiry: APPLY_VERIFY_EXPIRY,
      entryName,
    },
    idempotencyKey: `apply-verify:${entryId}:${tokenDigest(token)}`,
  });
}

// The application enters the review queue only after the address is confirmed, so the queue holds no spam from typo'd or forged addresses.
export async function enterReviewQueue(
  tx: Tx,
  entryId: string,
  email: string,
  entryName: string,
  locale: AppLocale,
) {
  const [open] = await tx
    .select({ id: reviewItem.id })
    .from(reviewItem)
    .where(
      and(
        eq(reviewItem.type, "application"),
        eq(reviewItem.entityType, "entry"),
        eq(reviewItem.entityId, entryId),
        eq(reviewItem.status, "open"),
      ),
    )
    .limit(1);
  // One open item per application, even if confirm and resubmit race.
  if (open) return;
  const [item] = await tx
    .insert(reviewItem)
    .values({ type: "application", entityType: "entry", entityId: entryId })
    .returning({ id: reviewItem.id });
  await enqueueEmail(tx, {
    template: "application_received",
    to: email,
    props: { locale, entryName },
    idempotencyKey: `application-received:${item.id}`,
  });
}

export async function createApplication(
  input: ApplicationInput,
  locale: AppLocale,
): Promise<SubmitApplicationResult> {
  const id = uuidv7();
  await db.transaction(async (tx) => {
    // The real slug is allocated at confirmation, so an unconfirmed draft never blocks a name.
    const fields = await applicationEntryFields(id, input);
    await tx.insert(entry).values({
      id,
      slug: `${DRAFT_SLUG_PREFIX}${id}`,
      status: "draft",
      sourceLocale: detectSourceLocale(fields.descriptionText, locale),
      ...fields,
    });
    await writeChange(tx, {
      entityType: "entry",
      entityId: id,
      userId: null,
      source: "owner",
      action: "create",
      after: { status: "draft", kind: input.kind, name: input.name },
    });
    await queueVerification(tx, id, fields.contactEmail, input.name, locale);
  });
  return { status: "verify" };
}

// Rejected applications are edited in place and queued again; a changed address is verified first.
export async function resubmitApplication(
  input: ApplicationInput,
  editToken: string,
): Promise<SubmitApplicationResult> {
  const entryId = await entryIdForToken("apply-edit", editToken);
  if (!entryId) throw new NotFoundError();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(entry)
      .where(and(eq(entry.id, entryId), eq(entry.status, "rejected")))
      .limit(1)
      .for("update");
    if (!row) throw new NotFoundError();

    const fields = await applicationEntryFields(entryId, input);
    const emailChanged = fields.contactEmail !== row.contactEmail;
    // A placeholder slug stays one until confirmation; a real slug is renewed only when the name changed.
    const slug =
      row.name === input.name || row.slug.startsWith(DRAFT_SLUG_PREFIX)
        ? row.slug
        : await allocateSlug(tx, input.name);
    const locale = row.sourceLocale as AppLocale;
    await tx
      .update(entry)
      .set({
        ...fields,
        sourceLocale: detectSourceLocale(fields.descriptionText, locale),
        slug,
        status: emailChanged ? "draft" : "pending",
      })
      .where(eq(entry.id, entryId));
    const changed = changedFields(row, fields);
    if (changed.length > 0)
      await writeChange(tx, {
        entityType: "entry",
        entityId: entryId,
        userId: null,
        source: "owner",
        action: "update",
        before: pickFields(row, changed),
        after: pickFields(fields, changed),
      });
    await writeChange(tx, {
      entityType: "entry",
      entityId: entryId,
      userId: null,
      source: "owner",
      action: "status_change",
      before: { status: "rejected" },
      after: { status: emailChanged ? "draft" : "pending" },
    });
    // The edit link served its purpose; a new address also invalidates every earlier confirm link.
    await revokeApplicationTokens(tx, "apply-edit", entryId);
    if (emailChanged) {
      await revokeApplicationTokens(tx, "apply-verify", entryId);
      await queueVerification(
        tx,
        entryId,
        fields.contactEmail,
        input.name,
        locale,
      );
      return { status: "verify" as const };
    }
    await enterReviewQueue(
      tx,
      entryId,
      fields.contactEmail,
      input.name,
      locale,
    );
    return { status: "received" as const };
  });
}
