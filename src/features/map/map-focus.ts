// Desktop centres on the open entry page. Phones centre on the selected entry only once its
// sheet has reported its height, so the padding keeps the pin above the sheet.
export function mapFocusSlug(
  wide: boolean,
  pageSlug: string | null,
  selectedSlug: string | null,
  sheetCovered: number,
): string | null {
  if (wide) return pageSlug;
  return sheetCovered > 0 ? selectedSlug : null;
}
