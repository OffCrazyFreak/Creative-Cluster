import { scrubPathTokens, scrubUrl } from "../privacy/scrub-url";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Secrets also arrive as bare query parameters, with or without a leading "?".
const QUERY_TOKEN = /(^|[?&])((?:token|code|key)=)[^&#\s"']+/g;
const LONG_SECRET = /\b[A-Za-z0-9_-]{32,}\b/g;

export function scrubString(value: string): string {
  return scrubPathTokens(value)
    .replace(EMAIL, "[email]")
    .replace(QUERY_TOKEN, "$1$2[token]")
    .replace(LONG_SECRET, "[token]");
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return scrubString(value);
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, scrubValue(v, depth + 1)]),
  );
}

// Span and trace data keys that hold a URL (cleaned to path only) or a query string (dropped).
const URL_KEYS = /^(url|url\.full|http\.url|http\.target|url\.path)$/;
const QUERY_KEYS = /^(url\.query|http\.query|query_string)$/;

function scrubAttributes(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (typeof value !== "string") return [key, value];
      if (QUERY_KEYS.test(key)) return [key, "[redacted]"];
      if (URL_KEYS.test(key)) return [key, scrubUrl(value)];
      return [key, value];
    }),
  );
}

function scrubSpan(span: unknown): unknown {
  if (typeof span !== "object" || span === null) return span;
  const copy: Record<string, unknown> = { ...span };
  if ("data" in copy) copy.data = scrubAttributes(copy.data);
  if ("attributes" in copy) copy.attributes = scrubAttributes(copy.attributes);
  if (typeof copy.description === "string") {
    copy.description = scrubString(copy.description);
  }
  return copy;
}

// Fields such as debug ids, trace ids and event ids are left alone so source maps and traces keep working.
const SCRUBBED_FIELDS = [
  "message",
  "transaction",
  "exception",
  "breadcrumbs",
  "extra",
  "tags",
] as const;

function scrubRequest(request: unknown): unknown {
  if (typeof request !== "object" || request === null) return request;
  const copy: Record<string, unknown> = { ...request };
  if (typeof copy.url === "string") copy.url = scrubUrl(copy.url);
  // Query strings carry filters and tokens; Sentry stores them without the leading "?".
  if ("query_string" in copy) copy.query_string = "[redacted]";
  return { ...copy, cookies: undefined, headers: undefined, data: undefined };
}

export function scrubEvent<T extends object>(event: T): T {
  const copy = { ...(event as Record<string, unknown>) };
  for (const field of SCRUBBED_FIELDS) {
    if (copy[field] !== undefined) copy[field] = scrubValue(copy[field], 0);
  }
  if (copy.request !== undefined) copy.request = scrubRequest(copy.request);
  if (Array.isArray(copy.spans)) copy.spans = copy.spans.map(scrubSpan);
  const contexts = copy.contexts as { trace?: unknown } | undefined;
  if (contexts?.trace) {
    copy.contexts = { ...contexts, trace: scrubSpan(contexts.trace) };
  }
  // User id only: no email, name or IP address.
  const user = copy.user as { id?: string | number } | undefined;
  if (user) copy.user = user.id ? { id: user.id } : undefined;
  return copy as T;
}
