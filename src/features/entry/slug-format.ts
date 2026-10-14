import { RESERVED_SLUGS } from "@/constants/slugs";

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 80;
const reserved = new Set<string>(RESERVED_SLUGS);

export function isReservedSlug(slug: string): boolean {
  return reserved.has(slug.toLowerCase());
}

// Admin-typed slugs: trimmed and lowercased, then they must already be lowercase ASCII with single hyphens.
export function normalizeSlug(input: string): string {
  const slug = input.trim().toLowerCase();
  if (!slug || slug.length > MAX_SLUG_LENGTH || !SLUG_FORMAT.test(slug))
    throw new Error("Invalid slug format");
  if (isReservedSlug(slug)) throw new Error("Slug is reserved");
  return slug;
}
