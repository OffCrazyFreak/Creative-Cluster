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
import { NotFoundError } from "@/server/errors";

import { applicationEntryFields } from "./apply-entry-fields";
import type {
  ApplicationInput,
  SubmitApplicationResult,
} from "./apply-schemas";
import {
  entryIdForToken,
  issueApplicationToken,
} from "./application-tokens.server";

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
    idempotencyKey: `apply-verify:${token}`,
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
    const slug = await allocateSlug(tx, input.name);
    const fields = applicationEntryFields(id, input);
    await tx
      .insert(entry)
      .values({ id, slug, status: "draft", sourceLocale: locale, ...fields });
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

    const fields = applicationEntryFields(entryId, input);
    const emailChanged = fields.contactEmail !== row.contactEmail;
    const slug =
      row.name === input.name ? row.slug : await allocateSlug(tx, input.name);
    const locale = row.sourceLocale as AppLocale;
    await tx
      .update(entry)
      .set({
        ...fields,
        slug,
        status: emailChanged ? "draft" : "pending",
      })
      .where(eq(entry.id, entryId));
    await writeChange(tx, {
      entityType: "entry",
      entityId: entryId,
      userId: null,
      source: "owner",
      action: "status_change",
      before: { status: "rejected" },
      after: { status: emailChanged ? "draft" : "pending" },
    });
    if (emailChanged) {
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
