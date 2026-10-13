const BLURB_LENGTH = 140;

// Plain-text teaser for lists and the map search index; cut on a word boundary.
export function makeBlurb(text: string, length = BLURB_LENGTH): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= length) return clean;
  const cut = clean.slice(0, length);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > length / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
