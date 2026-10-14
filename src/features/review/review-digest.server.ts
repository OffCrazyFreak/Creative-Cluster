import { and, asc, count, eq, gte } from "drizzle-orm";

import { LOCALES, type AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { entry, reviewItem, user } from "@/db/schema";
import type { IDigestItem } from "@/emails/email-types";
import { pageLink } from "@/lib/auth/auth-email.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { site } from "@/sites";

const DAY_MS = 86_400_000;

function ageDays(createdAt: Date, now: Date): number {
  return Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
}

async function recentItems(type: "application" | "report", now: Date) {
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
        gte(reviewItem.createdAt, new Date(now.getTime() - DAY_MS)),
      ),
    )
    .orderBy(asc(reviewItem.createdAt));
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

function adminLocale(value: string): AppLocale {
  return LOCALES.find((l) => l === value) ?? site.baseLocale;
}

// One mail per admin per day, and none when nothing is new. Names and short details only.
export async function queueReviewDigests(now = new Date()) {
  const applications = await recentItems("application", now);
  const reports = await recentItems("report", now);
  if (applications.length === 0 && reports.length === 0) return;

  const admins = await db
    .select({ id: user.id, email: user.email, locale: user.locale })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.banned, false)));
  const day = now.toISOString().slice(0, 10);
  const openTotal = await openApplicationTotal();
  const oldestAgeDays = await oldestOpenApplication(now);

  const applicationItems: IDigestItem[] = applications.map((row) => ({
    name: row.name,
    detail: [row.kind, row.countryCode, `${ageDays(row.createdAt, now)} d`]
      .filter(Boolean)
      .join(", "),
    ageDays: ageDays(row.createdAt, now),
  }));
  const reportItems: IDigestItem[] = reports.map((row) => ({
    name: row.name,
    detail: typeof row.payload.reason === "string" ? row.payload.reason : "",
    ageDays: ageDays(row.createdAt, now),
  }));

  await db.transaction(async (tx) => {
    for (const admin of admins) {
      const locale = adminLocale(admin.locale);
      const link = pageLink("/admin", locale);
      if (applicationItems.length > 0)
        await enqueueEmail(tx, {
          template: "application_digest",
          to: admin.email,
          props: {
            locale,
            count: applicationItems.length,
            openTotal,
            oldestAgeDays,
            items: applicationItems,
            link,
          },
          idempotencyKey: `digest:application:${day}:${admin.id}`,
        });
      if (reportItems.length > 0)
        await enqueueEmail(tx, {
          template: "report_digest",
          to: admin.email,
          props: {
            locale,
            count: reportItems.length,
            items: reportItems,
            link,
          },
          idempotencyKey: `digest:report:${day}:${admin.id}`,
        });
    }
  });
}
