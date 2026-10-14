import { and, asc, count, eq, gte, lt } from "drizzle-orm";

import { LOCALES, type AppLocale } from "@/constants/locales";
import { REPORT_REASONS, type ReportReason } from "@/constants/review";
import { db } from "@/db/client.server";
import { entry, reviewItem, usageCounter, user } from "@/db/schema";
import type { IDigestItem } from "@/emails/email-types";
import { pageLink } from "@/lib/auth/auth-email.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { kindLabel } from "@/features/admin-entries/entry-kind-label";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import { reportReasonLabel } from "./review-labels";

const DAY_MS = 86_400_000;

function ageDays(createdAt: Date, now: Date): number {
  return Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
}

function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.includes(value as ReportReason);
}

function ageText(days: number, locale: AppLocale): string {
  return days <= 0
    ? m.review_age_today({}, { locale })
    : m.review_age_days({ count: days }, { locale });
}

async function recentItems(
  type: "application" | "report",
  since: Date,
  until: Date,
) {
  return db
    .select({
      id: reviewItem.id,
      createdAt: reviewItem.createdAt,
      payload: reviewItem.payload,
      name: entry.name,
      kind: entry.kind,
      countryCode: entry.countryCode,
    })
    .from(reviewItem)
    .innerJoin(entry, eq(entry.id, reviewItem.entityId))
    .where(
      and(
        eq(reviewItem.type, type),
        eq(reviewItem.status, "open"),
        gte(reviewItem.createdAt, since),
        // Items after this run's start belong to the next window, not to both.
        lt(reviewItem.createdAt, until),
      ),
    )
    .orderBy(asc(reviewItem.createdAt));
}

type DigestRow = Awaited<ReturnType<typeof recentItems>>[number];

// Each admin reads the lines in their own language.
function applicationLines(
  rows: DigestRow[],
  now: Date,
  locale: AppLocale,
): IDigestItem[] {
  return rows.map((row) => {
    const days = ageDays(row.createdAt, now);
    return {
      name: row.name,
      detail: [
        kindLabel(row.kind, locale),
        row.countryCode,
        ageText(days, locale),
      ]
        .filter(Boolean)
        .join(", "),
      ageDays: days,
    };
  });
}

function reportLines(
  rows: DigestRow[],
  now: Date,
  locale: AppLocale,
): IDigestItem[] {
  return rows.map((row) => ({
    name: row.name,
    detail: isReportReason(row.payload.reason)
      ? reportReasonLabel(row.payload.reason, locale)
      : "",
    ageDays: ageDays(row.createdAt, now),
  }));
}

async function openApplicationTotal() {
  const [row] = await db
    .select({ total: count() })
    .from(reviewItem)
    .where(
      and(eq(reviewItem.type, "application"), eq(reviewItem.status, "open")),
    );
  return row?.total ?? 0;
}

async function oldestOpenApplication(now: Date) {
  const [row] = await db
    .select({ createdAt: reviewItem.createdAt })
    .from(reviewItem)
    .where(
      and(eq(reviewItem.type, "application"), eq(reviewItem.status, "open")),
    )
    .orderBy(asc(reviewItem.createdAt))
    .limit(1);
  return row ? ageDays(row.createdAt, now) : 0;
}

const DIGEST_MARKER = "review-digest:last";

// The marker's window start is the time of the last run, so a missed day is caught up on the next one.
async function lastDigestTime(now: Date): Promise<Date> {
  const [row] = await db
    .select({ at: usageCounter.windowStart })
    .from(usageCounter)
    .where(eq(usageCounter.key, DIGEST_MARKER))
    .limit(1);
  return row?.at ?? new Date(now.getTime() - DAY_MS);
}

async function markDigestRun(now: Date) {
  await db
    .insert(usageCounter)
    .values({ key: DIGEST_MARKER, windowStart: now, count: 0 })
    .onConflictDoUpdate({
      target: usageCounter.key,
      set: { windowStart: now },
    });
}

function adminLocale(value: string): AppLocale {
  return LOCALES.find((l) => l === value) ?? site.baseLocale;
}

// One mail per admin per day, and none when nothing is new. Names and short details only.
export async function queueReviewDigests(now = new Date()) {
  const since = await lastDigestTime(now);
  const applications = await recentItems("application", since, now);
  const reports = await recentItems("report", since, now);
  if (applications.length === 0 && reports.length === 0) {
    await markDigestRun(now);
    return;
  }

  const admins = await db
    .select({ id: user.id, email: user.email, locale: user.locale })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.banned, false)));
  // Keyed by the window start, so a retry of the same window never mails twice.
  const window = since.toISOString();
  const openTotal = await openApplicationTotal();
  const oldestAgeDays = await oldestOpenApplication(now);

  await db.transaction(async (tx) => {
    for (const admin of admins) {
      const locale = adminLocale(admin.locale);
      const link = pageLink("/admin", locale);
      if (applications.length > 0)
        await enqueueEmail(tx, {
          template: "application_digest",
          to: admin.email,
          props: {
            locale,
            count: applications.length,
            openTotal,
            oldestAgeDays,
            items: applicationLines(applications, now, locale),
            link,
          },
          idempotencyKey: `digest:application:${window}:${admin.id}`,
        });
      if (reports.length > 0)
        await enqueueEmail(tx, {
          template: "report_digest",
          to: admin.email,
          props: {
            locale,
            count: reports.length,
            items: reportLines(reports, now, locale),
            link,
          },
          idempotencyKey: `digest:report:${window}:${admin.id}`,
        });
    }
  });
  await markDigestRun(now);
}
