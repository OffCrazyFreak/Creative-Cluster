// Netlify applies netlify.toml [[headers]] only to static files, so SSR responses get
// these from the server entry. netlify.toml repeats them for static assets
// (tests/security-headers.test.ts keeps the two in sync).
export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  "X-Frame-Options": "DENY",
};

export function withSecurityHeaders(
  response: Response,
  extra: Record<string, string> = {},
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
