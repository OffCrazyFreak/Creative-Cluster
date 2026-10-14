import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry, addTag } from "../../../tests/helpers/fixture-data";
import { addOpportunity } from "../../../tests/helpers/opportunity-fixtures";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("opp_public") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const {
  listPublicOpportunities,
  countActiveByEntry,
  listSitemapOpportunities,
} = await import("./public-opportunities.server");

const DAY = 86_400_000;

describe.skipIf(!temp)("public opportunities", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function live(entryId: string, title: string, extra = {}) {
    return addOpportunity(db, entryId, {
      title,
      status: "published",
      publishedAt: new Date(),
      ...extra,
    });
  }
  async function titles(input = {}) {
    const { items } = await listPublicOpportunities({
      locale: "en",
      ...input,
    });
    return items.map((item) => item.title);
  }

  it("lists only live posts of published entries", async () => {
    const shown = await addEntry(db, "Shown");
    const hidden = await addEntry(db, "Hidden", {}, { status: "suspended" });
    await live(shown.id, "visible-live");
    await live(hidden.id, "hidden-suspended");
    await addOpportunity(db, shown.id, { title: "hidden-pending" });
    await live(shown.id, "hidden-expired", {
      expiresAt: new Date(Date.now() - 1000),
    });
    await addOpportunity(db, shown.id, {
      title: "hidden-removed",
      status: "removed",
    });
    const found = await titles();
    expect(found).toContain("visible-live");
    expect(found.filter((t) => t.startsWith("hidden"))).toEqual([]);
  });

  it("keeps a post filled this week with a label and drops it after 7 days", async () => {
    const owner = await addEntry(db, "Filler");
    await live(owner.id, "filled-fresh", {
      status: "closed",
      closedReason: "filled",
      closedAt: new Date(Date.now() - 2 * DAY),
    });
    await live(owner.id, "filled-old", {
      status: "closed",
      closedReason: "filled",
      closedAt: new Date(Date.now() - 8 * DAY),
    });
    const { items } = await listPublicOpportunities({ locale: "en" });
    expect(items.find((i) => i.title === "filled-fresh")?.filled).toBe(true);
    expect(items.some((i) => i.title === "filled-old")).toBe(false);
  });

  it("sorts by deadline first, posts without one last, then newest", async () => {
    const owner = await addEntry(db, "Sorter");
    function day(n: number) {
      return new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
    }
    await live(owner.id, "sort-late", { deadline: day(30) });
    await live(owner.id, "sort-none-old", {
      publishedAt: new Date(Date.now() - 5 * DAY),
    });
    await live(owner.id, "sort-soon", { deadline: day(3) });
    await live(owner.id, "sort-none-new");
    const order = (await titles()).filter((t) => t.startsWith("sort-"));
    expect(order).toEqual([
      "sort-soon",
      "sort-late",
      "sort-none-new",
      "sort-none-old",
    ]);
  });

  it("filters by type, category, country, closing soon and tag", async () => {
    const hr = await db
      .update(schema.entry)
      .set({ countryCode: "HR" })
      .where(eq(schema.entry.id, (await addEntry(db, "Croatian")).id))
      .returning();
    const de = await db
      .update(schema.entry)
      .set({ countryCode: "DE" })
      .where(eq(schema.entry.id, (await addEntry(db, "German")).id))
      .returning();
    const tag = await addTag(db, "filter-tag");
    const tagged = await live(hr[0].id, "f-offer-space", {
      type: "offering",
      category: "space",
    });
    await db
      .insert(schema.opportunityTag)
      .values({ opportunityId: tagged.id, tagId: tag.id });
    await live(de[0].id, "f-seek-partner", {
      expiresAt: new Date(Date.now() + 3 * DAY),
    });
    function only(found: string[]) {
      return found.filter((t) => t.startsWith("f-"));
    }
    expect(only(await titles({ type: "offering" }))).toEqual(["f-offer-space"]);
    expect(only(await titles({ category: "partner" }))).toEqual([
      "f-seek-partner",
    ]);
    expect(only(await titles({ country: "hr" }))).toEqual(["f-offer-space"]);
    expect(only(await titles({ closing: true }))).toEqual(["f-seek-partner"]);
    expect(only(await titles({ tags: ["filter-tag"] }))).toEqual([
      "f-offer-space",
    ]);
  });

  it("hides tags that are not public and offers only live options as facets", async () => {
    const owner = await addEntry(db, "Faceted");
    const suggested = await addTag(db, "facet-suggested", {
      status: "suggested",
    });
    const post = await live(owner.id, "facet-post");
    await db
      .insert(schema.opportunityTag)
      .values({ opportunityId: post.id, tagId: suggested.id });
    const { items, facets } = await listPublicOpportunities({ locale: "en" });
    expect(items.find((i) => i.id === post.id)?.tags).toEqual([]);
    expect(facets.tags.map((t) => t.slug)).not.toContain("facet-suggested");
  });

  it("uses a stored translation for the viewer's language", async () => {
    const owner = await addEntry(db, "Translated");
    const post = await live(owner.id, "tr-original");
    await db.insert(schema.translation).values({
      entityType: "opportunity",
      entityId: post.id,
      field: "title",
      locale: "hr",
      text: "tr-prijevod",
      origin: "machine",
      sourceHash: "x",
    });
    const { items } = await listPublicOpportunities({ locale: "hr" });
    const item = items.find((i) => i.id === post.id);
    expect(item).toMatchObject({ title: "tr-prijevod", titleLang: "hr" });
  });

  it("counts live posts per entry for the map badge", async () => {
    const owner = await addEntry(db, "Badged");
    await live(owner.id, "badge-1");
    await live(owner.id, "badge-2");
    await live(owner.id, "badge-expired", {
      expiresAt: new Date(Date.now() - 1000),
    });
    expect((await countActiveByEntry()).get(owner.id)).toBe(2);
  });

  it("puts only live posts of public entries in the sitemap", async () => {
    const owner = await addEntry(db, "Mapped");
    const hidden = await addEntry(
      db,
      "Mapped hidden",
      {},
      { status: "suspended" },
    );
    const liveOne = await live(owner.id, "sitemap-live");
    await live(owner.id, "sitemap-expired", {
      expiresAt: new Date(Date.now() - 1000),
    });
    await live(hidden.id, "sitemap-suspended");
    const ids = (await listSitemapOpportunities()).map((row) => row.id);
    expect(ids).toContain(liveOne.id);
    const all = await db.select().from(schema.opportunity);
    const unwanted = all.filter(
      (row) => row.title.startsWith("sitemap-") && row.id !== liveOne.id,
    );
    expect(unwanted.length).toBe(2);
    for (const row of unwanted) expect(ids).not.toContain(row.id);
  });
});
