import type { EmailExpiry } from "@/constants/email";
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

export function recipientLocale(user: IMailRecipient): AppLocale {
  return LOCALES.find((locale) => locale === user.locale) ?? site.baseLocale;
}

// Links point at our own pages (not /api/auth) and carry the recipient's language prefix.
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
      expiry: "hour",
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
