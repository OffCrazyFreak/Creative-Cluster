import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("escapes script-breaking characters and round-trips", () => {
    const data = { name: '</script><script>alert("x")</script> &\u2028\u2029' };
    const text = serializeJsonLd(data);
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
    expect(text).not.toContain("&");
    expect(JSON.parse(text)).toEqual(data);
  });
});
