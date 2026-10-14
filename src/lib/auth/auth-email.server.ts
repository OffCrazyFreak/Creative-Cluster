import { AUTH_LINK_EXPIRY, type EmailExpiry } from "@/constants/email";
import { LOCALES, type AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { env } from "@/env.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import { localizeHref } from "@/paraglide/runtime";
import { site } from "@/sites";

interface IMailRecipient {
  email: string;
  locale?: string | null;
}

// better-auth types the callback user without our additional fields, so the cast lives here once.
export function toRecipient(user: { email: string }): IMailRecipient {
  return { email: user.email, locale: (user as { locale?: string }).locale };
}

export function recipientLocale(user: IMailRecipient): AppLocale {
  return LOCALES.find((locale) => locale === user.locale) ?? site.baseLocale;
}

// Reset and invite links point at our own pages with the recipient's language prefix; the
// verification links stay on better-auth's verify endpoint, which must see the token itself.
export function pageLink(path: string, locale: AppLocale): string {
  return new URL(localizeHref(path, { locale }), env.BETTER_AUTH_URL).href;
}

interface IAuthMail {
  user: IMailRecipient;
  link: string;
  expiry: EmailExpiry;
  idempotencyKey: string;
}

export async function queueResetEmail(user: IMailRecipient, token: string) {
  const locale = recipientLocale(user);
  await enqueueEmail(db, {
    template: "reset",
    to: user.email,
    props: {
      locale,
      link: pageLink(
        `/reset-password?token=${encodeURIComponent(token)}`,
        locale,
      ),
      expiry: AUTH_LINK_EXPIRY,
    },
    idempotencyKey: `reset:${token}`,
  });
  await triggerDrain();
}

// A verified user whose address changes is confirming the new address; anyone else is verifying.
export async function queueVerificationEmail(
  mail: IAuthMail & { emailVerified: boolean },
) {
  const { user, link, expiry, idempotencyKey, emailVerified } = mail;
  const props = { locale: recipientLocale(user), link, expiry };
  await enqueueEmail(db, {
    template: emailVerified ? "change" : "verify",
    to: user.email,
    props,
    idempotencyKey,
  });
  await triggerDrain();
}
