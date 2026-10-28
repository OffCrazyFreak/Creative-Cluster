import { describe, expect, it, vi } from "vitest";

vi.mock("@/env.server", () => ({
  env: {
    PSEUDONYM_SECRET: "test-secret",
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://localhost:3000",
  },
}));
vi.mock("@/db/client.server", () => ({ db: {} }));
const { claimEmailProps, claimReminderProps } =
  await import("./claim-email-props.server");

const source = {
  inviteId: "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
  name: "Studio",
  importedAt: new Date("2026-01-15T00:00:00Z"),
};

describe("claim email links", () => {
  it("point at the page in the language of the mail", () => {
    const en = claimEmailProps({ ...source, sourceLocale: "en" }, "import");
    const hr = claimEmailProps({ ...source, sourceLocale: "hr" }, "import");
    expect(new URL(en.link).pathname).toMatch(/^\/claim\//);
    expect(new URL(hr.link).pathname).toMatch(/^\/hr\/claim\//);
    expect(hr.removeLink).toBe(`${hr.link}/remove`);
    const reminder = claimReminderProps(
      { ...source, sourceLocale: "hr" },
      new Date("2026-03-01T00:00:00Z"),
    );
    expect(new URL(reminder.removeLink).pathname).toMatch(
      /^\/hr\/claim\/.+\/remove$/,
    );
  });
});
