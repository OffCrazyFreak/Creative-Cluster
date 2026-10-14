import { and, eq } from "drizzle-orm";

import { INVITE_EXPIRY, INVITE_TOKEN_TTL_SECONDS } from "@/constants/email";
import { LOCALES, type AppLocale } from "@/constants/locales";
import type { Tx } from "@/db/client.server";
import { account, entry, reviewItem, user } from "@/db/schema";
import { pageLink } from "@/lib/auth/auth-email.server";
import { createPasswordToken } from "@/lib/auth/password-token.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
import { NotFoundError } from "@/server/errors";
import { site } from "@/sites";

async function ownerAccount(
  tx: Tx,
  email: string,
  name: string,
  locale: AppLocale,
) {
  async function find() {
    const [row] = await tx
      .select({ id: user.id, banned: user.banned })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    return row;
  }
  const existing = await find();
  // A blocked account must not receive a listing; the admin sees a failed decision and can act.
  if (existing?.banned) throw new Error("The applicant's account is blocked");
  if (existing) return { id: existing.id, created: false };
  // The confirmed application address is the proof of ownership, so the account starts verified.
  const [created] = await tx
    .insert(user)
    .values({ email, name, emailVerified: true, locale })
    .onConflictDoNothing({ target: user.email })
    .returning({ id: user.id });
  const id = created?.id ?? (await find())?.id;
  if (!id) throw new Error("Approval could not resolve the owner account");
  return { id, created: Boolean(created) };
}

async function hasPassword(tx: Tx, userId: string) {
  const [row] = await tx
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    )
    .limit(1);
  return Boolean(row);
}

interface IApproveInput {
  itemId: string;
  entryId: string;
  adminId: string;
}

// Publishing, the owner account and the mail commit together: no approval without an owner.
export async function approveApplication(tx: Tx, input: IApproveInput) {
  const [row] = await tx
    .select()
    .from(entry)
    .where(and(eq(entry.id, input.entryId), eq(entry.status, "pending")))
    .limit(1)
    .for("update");
  if (!row?.contactEmail) throw new NotFoundError();

  const locale = LOCALES.find((l) => l === row.sourceLocale) ?? site.baseLocale;
  const owner = await ownerAccount(
    tx,
    row.contactEmail,
    row.contactName ?? row.name,
    locale,
  );
  await tx
    .update(entry)
    .set({
      status: "published",
      ownerUserId: owner.id,
      trusted: true,
      publishedAt: new Date(),
    })
    .where(eq(entry.id, row.id));
  await tx
    .update(reviewItem)
    .set({
      status: "approved",
      decidedBy: input.adminId,
      decidedAt: new Date(),
    })
    .where(eq(reviewItem.id, input.itemId));
  await writeChange(tx, {
    entityType: "entry",
    entityId: row.id,
    userId: input.adminId,
    source: "admin",
    action: "status_change",
    before: { status: "pending", ownerUserId: null },
    after: { status: "published", ownerUserId: owner.id },
  });

  await enqueueTranslation(tx, { entityType: "entry", entityId: row.id });
  const needsPassword = !(await hasPassword(tx, owner.id));
  const token = needsPassword
    ? await createPasswordToken(tx, owner.id, INVITE_TOKEN_TTL_SECONDS)
    : null;
  await enqueueEmail(tx, {
    template: "approved",
    to: row.contactEmail,
    props: {
      locale,
      entryName: row.name,
      link: token
        ? pageLink(`/set-password?token=${encodeURIComponent(token)}`, locale)
        : pageLink("/login", locale),
      expiry: INVITE_EXPIRY,
      newAccount: owner.created,
      needsPassword,
    },
    idempotencyKey: `approved:${input.itemId}`,
  });
}
