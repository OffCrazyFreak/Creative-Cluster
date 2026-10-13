// User-supplied links render only when they are plain http(s); anything else (javascript:, data:) is dropped.
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export const USER_LINK_REL = "nofollow ugc noopener noreferrer";
