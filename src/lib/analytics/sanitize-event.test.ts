import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";

import { sanitizeEvent } from "./sanitize-event";

describe("sanitizeEvent", () => {
  it("strips tokens and queries from PostHog url properties", () => {
    const event = {
      uuid: "1",
      event: "$pageview",
      properties: {
        $current_url: "https://x.test/claim/secret123?src=mail",
        $pathname: "/claim/secret123",
        $referrer: "https://x.test/reset-password/tok?x=1",
        filter: "tag",
      },
    } as CaptureResult;
    const out = sanitizeEvent(event);
    expect(out?.properties.$current_url).toBe("https://x.test/claim/[token]");
    expect(out?.properties.$pathname).toBe("/claim/[token]");
    expect(out?.properties.$referrer).toBe(
      "https://x.test/reset-password/[token]",
    );
    expect(out?.properties.filter).toBe("tag");
  });

  it("passes null through", () => {
    expect(sanitizeEvent(null)).toBeNull();
  });
});
