import { eq } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { user } from "@/db/schema";
import { site } from "@/sites";

import { enqueueEmail } from "./enqueue-email.server";

export interface ITermsNotice {
  // ISO date (YYYY-MM-DD) the new terms apply from; it also keys the idempotency of each mail.
  effectiveDate: string;
  summary: Record<AppLocale, string>;
}

function formatDate(isoDate: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export async function countTermsRecipients(): Promise<number> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.banned, false));
  return rows.length;
}

// Blocked accounts get no marketing-like mail; re-running the same notice is a no-op per user.
export async function enqueueTermsNotice(
  notice: ITermsNotice,
): Promise<number> {
  const recipients = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
    })
    .from(user)
    .where(eq(user.banned, false));
  await db.transaction(async (tx) => {
    for (const person of recipients) {
      const locale = person.locale as AppLocale;
      await enqueueEmail(tx, {
        template: "terms",
        to: person.email,
        idempotencyKey: `terms:${notice.effectiveDate}:${person.id}`,
        props: {
          locale,
          name: person.name,
          summary: notice.summary[locale],
          effectiveDate: formatDate(notice.effectiveDate, locale),
          link: `${site.origin}/terms`,
        },
      });
    }
  });
  return recipients.length;
}
