// Croatian đ has no NFD decomposition, so it is mapped by hand before stripping marks.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
