// The back arrow may step back in history only when that step lands on the map itself;
// any other earlier page (the directory, another site) would leave the map.
export function backReturnsToMap(
  mapHistoryIndex: number | null,
  historyIndex: number | null,
): boolean {
  if (mapHistoryIndex === null || historyIndex === null) return false;
  return historyIndex - 1 === mapHistoryIndex;
}
