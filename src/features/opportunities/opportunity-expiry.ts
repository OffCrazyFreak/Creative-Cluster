import { OPPORTUNITY_LIMITS as L } from "@/constants/opportunities";

const DAY_MS = 86_400_000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

// "YYYY-MM-DD" of the UTC day, the shape of the deadline column.
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// A deadline stays open through its own day, so the post lives until the end of it.
export function deadlineEnd(deadline: string): Date {
  return addDays(new Date(`${deadline}T00:00:00Z`), 1);
}

interface IPeriod {
  start: Date;
  deadline: string | null;
}

// Deadline + 1 day when set, otherwise 60 days; a period never runs past 180 days.
export function periodEnd({ start, deadline }: IPeriod): Date {
  const natural = deadline
    ? deadlineEnd(deadline)
    : addDays(start, L.defaultLifetimeDays);
  const cap = addDays(start, L.maxLifetimeDays);
  return natural < cap ? natural : cap;
}

export function isDeadlineAllowed(deadline: string, now: Date): boolean {
  return (
    deadline >= isoDay(now) &&
    deadline <= isoDay(addDays(now, L.maxLifetimeDays))
  );
}

interface IRenewable {
  status: string;
  expiresAt: Date;
  renewals: number;
}

export function isExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt <= now;
}

export function isExpiringSoon(expiresAt: Date, now: Date): boolean {
  return (
    expiresAt > now &&
    expiresAt.getTime() - now.getTime() <= L.renewWindowDays * DAY_MS
  );
}

// From the last 8 days or after expiry, up to 3 times, without a new review.
export function canRenew(post: IRenewable, now: Date): boolean {
  return (
    post.status === "published" &&
    post.renewals < L.maxRenewals &&
    (isExpired(post.expiresAt, now) || isExpiringSoon(post.expiresAt, now))
  );
}

// A renewal starts when the old period ends, so renewing early loses no days.
export function renewalStart(expiresAt: Date, now: Date): Date {
  return expiresAt > now ? expiresAt : now;
}

export function filledLabelVisible(closedAt: Date, now: Date): boolean {
  return now.getTime() - closedAt.getTime() < L.filledLabelDays * DAY_MS;
}

// Closed and expired pages stay up with a banner for 30 days, then answer 410.
export function pageGoneAt(endedAt: Date): Date {
  return addDays(endedAt, L.closedNoindexDays);
}
