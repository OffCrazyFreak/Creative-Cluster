const STORAGE_KEY = "cc-map-recent-searches";
const MAX_RECENT_SEARCHES = 5;

// Last map searches on this device, newest first.
export function readRecentSearches(): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(stored)
      ? stored.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function write(searches: string[]) {
  try {
    if (searches.length)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the search still works without history.
  }
}

// Moves a search to the front, dropping duplicates and the oldest past the cap.
export function addRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const rest = readRecentSearches().filter(
    (previous) => previous.toLowerCase() !== trimmed.toLowerCase(),
  );
  write([trimmed, ...rest].slice(0, MAX_RECENT_SEARCHES));
}

export function clearRecentSearches() {
  write([]);
}
