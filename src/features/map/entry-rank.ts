import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

type IRanked = Pick<IDirectoryEntry, "name" | "logo" | "opps">;

// A logo reads at a glance, live opportunities are what visitors come for, and the name keeps the order stable.
export function compareForStack(a: IRanked, b: IRanked): number {
  const logo = Number(Boolean(b.logo)) - Number(Boolean(a.logo));
  if (logo !== 0) return logo;
  const opps = Number(b.opps > 0) - Number(a.opps > 0);
  if (opps !== 0) return opps;
  return a.name.localeCompare(b.name);
}

export function topOfStack<T extends IRanked>(entries: T[], count: number) {
  return [...entries].sort(compareForStack).slice(0, count);
}
