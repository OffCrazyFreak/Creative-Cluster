import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry } from "../../../tests/helpers/fixture-data";
import { addOpportunity } from "../../../tests/helpers/opportunity-fixtures";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("opp_page") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { findOpportunityForPage } = await import("./opportunity-page.server");

const DAY = 86_400_000;

function ago(days: number) {
  return new Date(Date.now() - days * DAY);
}

describe.skipIf(!temp)("opportunity page", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function page(
    overrides: Partial<typeof schema.opportunity.$inferInsert>,
    entryStatus: "published" | "suspended" = "published",
  ) {
    const owner = await addEntry(db, "Page", {}, { status: entryStatus });
    const post = await addOpportunity(db, owner.id, {
      status: "published",
      publishedAt: new Date(),
      ...overrides,
    });
    return { post, result: await findOpportunityForPage(post.id, "en") };
  }

  it("serves a live post as active", async () => {
    const { result } = await page({});
    expect(result).toMatchObject({
      status: "found",
      opportunity: { state: "active" },
    });
  });

  it("keeps an expired post up for 30 days, then answers gone", async () => {
    expect((await page({ expiresAt: ago(2) })).result).toMatchObject({
      status: "found",
      opportunity: { state: "expired" },
    });
    expect((await page({ expiresAt: ago(31) })).result).toEqual({
      status: "gone",
    });
  });

  it("keeps a filled post up for 30 days, then answers gone", async () => {
    const filled = { status: "closed" as const, closedReason: "filled" };
    expect((await page({ ...filled, closedAt: ago(10) })).result).toMatchObject(
      { status: "found", opportunity: { state: "filled" } },
    );
    expect((await page({ ...filled, closedAt: ago(31) })).result).toEqual({
      status: "gone",
    });
  });

  it("answers gone for removed posts and posts of a suspended entry", async () => {
    expect(
      (await page({ status: "removed", closedAt: new Date() })).result,
    ).toEqual({ status: "gone" });
    expect((await page({}, "suspended")).result).toEqual({ status: "gone" });
  });

  it("keeps unapproved posts of a suspended entry hidden as missing, not gone", async () => {
    expect((await page({ status: "pending" }, "suspended")).result).toEqual({
      status: "missing",
    });
  });

  it("only shows a closed post as filled when it was filled", async () => {
    expect(
      (
        await page({
          status: "closed",
          closedAt: ago(1),
          closedReason: "other",
        })
      ).result,
    ).toEqual({ status: "gone" });
  });

  it("answers missing for posts nobody approved", async () => {
    expect((await page({ status: "pending" })).result).toEqual({
      status: "missing",
    });
    expect((await page({ status: "rejected" })).result).toEqual({
      status: "missing",
    });
  });

  it("flags a missing translation and returns a stored one", async () => {
    const { post, result } = await page({ sourceLocale: "hr" });
    expect(result).toMatchObject({
      opportunity: { translationMissing: true, translation: null },
    });
    await db.insert(schema.translation).values({
      entityType: "opportunity",
      entityId: post.id,
      field: "title",
      locale: "en",
      text: "Translated title",
      origin: "machine",
      sourceHash: "x",
    });
    const again = await findOpportunityForPage(post.id, "en");
    expect(again).toMatchObject({
      opportunity: {
        translationMissing: false,
        translation: { title: "Translated title", origin: "machine" },
      },
    });
  });
});
