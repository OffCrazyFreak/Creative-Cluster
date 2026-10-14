import { OPPORTUNITY_LIMITS as L } from "@/constants/opportunities";

const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
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
