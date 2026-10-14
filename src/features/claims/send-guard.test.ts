import { describe, expect, it } from "vitest";

import { sendBlocker } from "./send-guard";

const ok = { batch: 5, confirm: true, importSource: "A real source, 2026" };

describe("sendBlocker", () => {
  it("refuses without the approval env, even with every flag", () => {
    expect(sendBlocker({}, ok)).toContain("CLAIMS_SENDING_APPROVED");
    expect(sendBlocker({ CLAIMS_SENDING_APPROVED: "true" }, ok)).not.toBeNull();
  });

  it("needs --confirm, a sane batch and final wording", () => {
    const env = { CLAIMS_SENDING_APPROVED: "yes" };
    expect(sendBlocker(env, { ...ok, confirm: false })).toContain("--confirm");
    expect(sendBlocker(env, { ...ok, batch: null })).toContain("--batch");
    expect(sendBlocker(env, { ...ok, batch: 0 })).toContain("--batch");
    expect(sendBlocker(env, { ...ok, batch: 501 })).toContain("--batch");
    expect(
      sendBlocker(env, { ...ok, importSource: "[[GAP: import source]]" }),
    ).toContain("--import-source");
  });

  it("allows a fully approved run", () => {
    expect(sendBlocker({ CLAIMS_SENDING_APPROVED: "yes" }, ok)).toBeNull();
  });
});
