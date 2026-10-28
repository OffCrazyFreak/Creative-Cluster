import { count, eq, like } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { job, user } from "@/db/schema";
import { pageLink } from "@/lib/auth/auth-email.server";

import { enqueueEmail } from "./enqueue-email.server";

export interface ITermsNotice {
  // ISO date (YYYY-MM-DD) the new terms apply from; it also keys the idempotency of each mail.
  effectiveDate: string;
  summary: Record<AppLocale, string>;
}

const activeUsers = eq(user.banned, false);

export function isRealDate(isoDate: string): boolean {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(isoDate)
  );
}

// Croatian long dates end with a full stop, and the copy adds its own.
function formatDate(isoDate: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${isoDate}T00:00:00Z`))
    .replace(/\.$/, "");
}

// The copy puts the summary after "In short:" and adds the full stop itself.
function cleanSummary(text: string): string {
  return text.trim().replace(/[.!]+$/, "");
}

export async function countTermsRecipients(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(user)
    .where(activeUsers);
  return row?.total ?? 0;
}

async function countAlreadyQueued(effectiveDate: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(job)
    .where(like(job.idempotencyKey, `terms:${effectiveDate}:%`));
  return row?.total ?? 0;
}

// Blocked accounts are skipped. Each user gets one mail per effective date: running the same date
// again queues only users who have none yet, and reports how many were already queued.
export async function enqueueTermsNotice(notice: ITermsNotice) {
  const recipients = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
    })
    .from(user)
    .where(activeUsers);
  const before = await countAlreadyQueued(notice.effectiveDate);
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
          summary: cleanSummary(notice.summary[locale]),
          effectiveDate: formatDate(notice.effectiveDate, locale),
          link: pageLink("/terms", locale),
        },
      });
    }
  });
  const after = await countAlreadyQueued(notice.effectiveDate);
  return { queued: after - before, alreadyQueued: before };
}
