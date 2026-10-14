// Single-use links carry their secret in the path (/claim/<token>) or a query parameter.
const TOKEN_ROUTES =
  /(\/(?:claim|reset-password|set-password|verify)\/)[^/?#\s"']+/g;

// Query strings and fragments are dropped entirely: filters and tokens do not belong in analytics.
export function scrubUrl(url: string): string {
  return url.replace(/[?#].*$/, "").replace(TOKEN_ROUTES, "$1[token]");
}

export function scrubPathTokens(text: string): string {
  return text.replace(TOKEN_ROUTES, "$1[token]");
}
