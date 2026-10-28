import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LINK_LIMITS } from "@/constants/links";
import { usageCounter } from "@/db/schema";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import type * as AssertLinkFree from "./assert-link-free.server";
import type * as Slug from "@/features/entry/slug.server";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("propose_limit") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/lib/auth/auth-email.server", () => ({
  pageLink: (path: string) => `https://example.test${path}`,
}));
vi.mock("@/lib/jobs/trigger-drain.server", () => ({
  triggerDrain: () => Promise.resolve(),
}));
vi.mock("@/features/entry/slug.server", async (importOriginal) => {
  const actual = await importOriginal<typeof Slug>();
  return { ...actual, allocateSlug: vi.fn(actual.allocateSlug) };
});
vi.mock("./assert-link-free.server", async (importOriginal) => {
  const actual = await importOriginal<typeof AssertLinkFree>();
  return { assertLinkFree: vi.fn(actual.assertLinkFree) };
});
const { proposeLink } = await import("./propose-link.server");
const { assertLinkFree } = await import("./assert-link-free.server");
const { allocateSlug } = await import("@/features/entry/slug.server");

describe.skipIf(!temp)("proposal limits and errors", () => {
  const { db } = temp as ITempDatabase;
  let userId = "";
  let mine = "";
  let target = "";
  const base = {
    kind: "collaborated" as const,
    direction: "outgoing" as const,
    year: null,
    endYear: null,
    project: null,
    note: null,
    evidenceUrl: null,
  };

  beforeAll(async () => {
    userId = (await addUser(db, "limit owner")).id;
    mine = (await addEntry(db, "limit mine", {}, { ownerUserId: userId })).id;
    target = (await addEntry(db, "limit target")).id;
  });
  afterAll(async () => temp?.drop());

  it("does not spend the daily limit on refused attempts", async () => {
    const input = {
      ...base,
      fromEntryId: mine,
      target: { type: "entry" as const, entryId: target },
    };
    expect((await proposeLink(input, userId)).ok).toBe(true);
    for (let i = 0; i < LINK_LIMITS.proposalsPerOwnerPerDay; i += 1)
      expect(await proposeLink(input, userId)).toEqual({
        ok: false,
        error: "exists",
      });
    const [counter] = await db.select().from(usageCounter);
    expect(counter.count).toBe(1);
  });

  it("does not report a slug collision as an existing link", async () => {
    const taken = (await addEntry(db, "taken name")).slug;
    vi.mocked(allocateSlug).mockResolvedValueOnce(taken);
    await expect(
      proposeLink(
        {
          ...base,
          kind: "member_of",
          fromEntryId: mine,
          target: {
            type: "outside",
            name: "Brand New Partner",
            website: "https://new.example",
          },
          evidenceUrl: "https://new.example/members",
        },
        userId,
      ),
    ).rejects.toThrow();
  });

  it("still reports a race on the live link index as an existing link", async () => {
    vi.mocked(assertLinkFree).mockResolvedValueOnce();
    expect(
      await proposeLink(
        {
          ...base,
          fromEntryId: mine,
          target: { type: "entry", entryId: target },
        },
        userId,
      ),
    ).toEqual({ ok: false, error: "exists" });
  });
});
