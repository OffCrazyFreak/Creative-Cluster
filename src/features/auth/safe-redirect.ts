// URL parsers drop tabs and newlines, so "/\t/host" would parse to "//host" and leave the site.
function isUnsafeChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return char === "\\" || code <= 0x1f || code === 0x7f;
}

// The auth pages themselves are refused: a logged-in viewer sent to /login would bounce forever.
const AUTH_PAGE =
  /^(?:\/(?:hr|en))?\/(?:login|reset-password|set-password|claim)(?:[/?#]|$)/;

// Only same-site paths: "//host", backslashes and control characters can all point elsewhere.
export function safeRedirect(target: string | undefined): string | null {
  if (!target?.startsWith("/") || target.startsWith("//")) return null;
  if (AUTH_PAGE.test(target)) return null;
  return [...target].some(isUnsafeChar) ? null : target;
}
