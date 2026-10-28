import type { IImageRef } from "@/typings/images";

const PREFIX = "entry";

export const SELECTED_FRAME_ID = "selected-frame";
export const SELECTED_STACK_FRAME_ID = "selected-stack-frame";

export interface IEntryIcon {
  initials: string;
  logo: IImageRef | null;
}

// Up to two letters from the first two words; letters and digits only, so the id stays parseable.
// A name with neither still gets a mark rather than a blank tile.
export function entryInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase();
  return initials || "?";
}

// The id carries everything needed to draw the tile, so the missing image resolver can draw it.
// Entries with the same initials and no logo share one image.
export function entryIconId({ initials, logo }: IEntryIcon): string {
  return logo
    ? `${PREFIX}:${initials}:${logo.id}:${logo.hash}`
    : `${PREFIX}:${initials}`;
}

export function parseEntryIconId(id: string): IEntryIcon | null {
  const [prefix, initials, logoId, hash, ...rest] = id.split(":");
  if (prefix !== PREFIX || initials === undefined || rest.length > 0)
    return null;
  if (logoId === undefined) return { initials, logo: null };
  if (!logoId || !hash) return null;
  return { initials, logo: { id: logoId, hash } };
}
