import { describe, expect, it } from "vitest";

import {
  buildCsp,
  createNonce,
  cspHeaderName,
  sentryReportUri,
} from "./csp.server";

describe("csp", () => {
  it("puts the nonce in script and forbids framing", () => {
    const csp = buildCsp({ nonce: "abc", reportUri: null });
    expect(csp).toContain("script-src 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("report-uri");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("derives the Sentry report endpoint from the DSN", () => {
    expect(sentryReportUri("https://pubkey@o1.ingest.de.sentry.io/42")).toBe(
      "https://o1.ingest.de.sentry.io/api/42/security/?sentry_key=pubkey",
    );
    expect(sentryReportUri(undefined)).toBeNull();
    expect(sentryReportUri("nonsense")).toBeNull();
  });

  it("uses a fresh nonce and the right header", () => {
    expect(createNonce()).not.toBe(createNonce());
    expect(cspHeaderName("report-only")).toBe(
      "Content-Security-Policy-Report-Only",
    );
    expect(cspHeaderName("enforce")).toBe("Content-Security-Policy");
  });
});
