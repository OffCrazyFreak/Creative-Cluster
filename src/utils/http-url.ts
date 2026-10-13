const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    return HTTP_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Adds https:// when the user typed a bare domain; any other scheme stays and fails isHttpUrl.
export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return isHttpUrl(withScheme) ? withScheme : null;
}
