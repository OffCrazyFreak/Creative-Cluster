// Lowercase, no diacritics, "đ" as "d": the one key used to index and match place and street names.
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("đ", "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
