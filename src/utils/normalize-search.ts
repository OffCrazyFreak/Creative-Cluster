// Lowercase, no diacritics, "đ" as "d": the one key that indexes and matches place and street names.
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("đ", "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
