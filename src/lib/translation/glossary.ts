import { site } from "@/sites";

// Brand terms are the same on both sites, so the partner names never get translated.
const BRAND_TERMS = ["Creative Cluster", "Inovatori DNŽ"];

export function buildGlossary(entryName: string): string[] {
  const terms = [entryName, site.name, ...BRAND_TERMS]
    .map((term) => term.trim())
    .filter(Boolean);
  return [...new Set(terms)];
}
