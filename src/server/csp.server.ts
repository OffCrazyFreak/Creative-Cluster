export type CspMode = "report-only" | "enforce";

interface ICspOptions {
  nonce: string;
  reportUri: string | null;
}

// Sentry accepts CSP reports at the security endpoint of the same project.
export function sentryReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!url.username || !projectId) return null;
    return `${url.protocol}//${url.host}/api/${projectId}/security/?sentry_key=${url.username}`;
  } catch {
    return null;
  }
}

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildCsp({ nonce, reportUri }: ICspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // strict-dynamic lets the nonced bundle load its own chunks, PostHog and Turnstile.
    "script-src": [`'nonce-${nonce}'`, "'strict-dynamic'"],
    // Sonner injects an un-nonced <style> element and Base UI and MapLibre set style attributes at runtime.
    // Style injection is far less dangerous than script injection, so styles stay inline.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://res.cloudinary.com",
      "https://tiles.openfreemap.org",
    ],
    "font-src": ["'self'", "data:", "https://tiles.openfreemap.org"],
    "connect-src": [
      "'self'",
      "https://tiles.openfreemap.org",
      "https://api.cloudinary.com",
      "https://challenges.cloudflare.com",
      "https://*.ingest.de.sentry.io",
      "https://*.ingest.sentry.io",
    ],
    "worker-src": ["'self'", "blob:"],
    "child-src": ["blob:"],
    "frame-src": ["https://challenges.cloudflare.com"],
    "form-action": ["'self'", "https://accounts.google.com"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  const parts = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(" ")}`,
  );
  if (reportUri) parts.push(`report-uri ${reportUri}`);
  return parts.join("; ");
}

export function cspHeaderName(mode: CspMode): string {
  return mode === "enforce"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";
}
