// Step back only when that lands on the map; any other earlier page (the directory, another site) would leave it.
export function backReturnsToMap(
  mapHistoryIndex: number | null,
  historyIndex: number | null,
): boolean {
  if (mapHistoryIndex === null || historyIndex === null) return false;
  return historyIndex - 1 === mapHistoryIndex;
}
