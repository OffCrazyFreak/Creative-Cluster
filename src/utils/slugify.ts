import slugifyText from "@sindresorhus/slugify";

const FALLBACK_SLUG = "entry";

// The library transliterates Cyrillic, Greek and letters like ł or ß; Croatian đ is dj by convention.
export function slugify(text: string): string {
  const slug = slugifyText(text, {
    customReplacements: [
      ["đ", "dj"],
      ["Đ", "Dj"],
    ],
  })
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || FALLBACK_SLUG;
}
