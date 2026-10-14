import { describe, expect, it } from "vitest";

import { scrubEvent, scrubString } from "./scrub-event";

describe("scrubString", () => {
  it("removes emails and tokens", () => {
    expect(scrubString("mail a.b@example.org now")).toBe("mail [email] now");
    expect(scrubString("/claim/abc123DEF?x=1")).toBe("/claim/[token]?x=1");
    expect(scrubString("/reset-password?token=zzz&a=1")).toBe(
      "/reset-password?token=[token]&a=1",
    );
    expect(scrubString("secret A".padEnd(10) + "x".repeat(40))).toContain(
      "[token]",
    );
  });
});

describe("scrubEvent", () => {
  it("keeps only the user id and drops cookies and headers", () => {
    const out = scrubEvent({
      user: { id: "u1", email: "a@b.co", ip_address: "1.2.3.4" },
      request: { url: "/x", cookies: { a: "b" }, headers: { c: "d" } },
      message: "failed for a@b.co",
    });
    expect(out.user).toEqual({ id: "u1" });
    expect(out.request.cookies).toBeUndefined();
    expect(out.request.headers).toBeUndefined();
    expect(out.message).toBe("failed for [email]");
  });
});

describe("scrubEvent urls and spans", () => {
  it("drops the query string with or without a leading question mark", () => {
    const out = scrubEvent({
      request: {
        url: "https://x.test/claim/abc?token=zzz",
        query_string: "token=zzz&a=1",
      },
    });
    expect(out.request.url).toBe("https://x.test/claim/[token]");
    expect(out.request.query_string).toBe("[redacted]");
  });

  it("cleans url data on spans and the trace context but keeps ids", () => {
    const traceId = "8b2a249f3ba04f8ea62bee71b02d7deb";
    const out = scrubEvent({
      spans: [
        {
          trace_id: traceId,
          data: {
            "url.full": "https://x.test/reset-password/tok?x=1",
            "url.query": "?x=1",
            "http.query": "x=1",
            other: "kept",
          },
        },
      ],
      contexts: {
        trace: { trace_id: traceId, data: { "url.full": "/a?b=1" } },
      },
    });
    expect(out.spans[0].data).toEqual({
      "url.full": "https://x.test/reset-password/[token]",
      "url.query": "[redacted]",
      "http.query": "[redacted]",
      other: "kept",
    });
    expect(out.spans[0].trace_id).toBe(traceId);
    expect(out.contexts.trace.data["url.full"]).toBe("/a");
    expect(out.contexts.trace.trace_id).toBe(traceId);
  });
});
