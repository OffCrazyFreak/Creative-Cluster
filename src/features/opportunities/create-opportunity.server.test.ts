import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { richTextFromPlain } from "@/lib/rich-text/empty-rich-text";
import { NotFoundError } from "@/server/errors";

import { addEntry, addTag, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import {
  opportunityValuesSchema,
  type OpportunityFormValues,
} from "./opportunity-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("opp_create") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { createOpportunity } = await import("./create-opportunity.server");
const { listOwnOpportunities } = await import("./own-opportunities.server");

function values(title: string, overrides: Partial<OpportunityFormValues> = {}) {
  return opportunityValuesSchema.parse({
    type: "seeking",
    category: "partner",
    title,
    body: richTextFromPlain("We need a partner."),
    sourceLocale: "en",
    remoteOk: false,
    deadline: "",
    tagIds: [],
    ...overrides,
  });
}

describe.skipIf(!temp)("createOpportunity", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function setup(status: "published" | "suspended" = "published") {
    const owner = await addUser(db, "owner");
    const row = await addEntry(
      db,
      "Studio",
      {},
      { ownerUserId: owner.id, status },
    );
    return { owner, row };
  }
  function post(
    owner: { id: string },
    title: string,
    overrides: Partial<OpportunityFormValues> = {},
  ) {
    return createOpportunity({
      userId: owner.id,
      values: values(title, overrides),
    });
  }
  async function approveAll(entryId: string) {
    await db
      .update(schema.opportunity)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(schema.opportunity.entryId, entryId));
  }

  it("sends the first post to review and publishes later ones at once", async () => {
    const { owner, row } = await setup();
    expect(await post(owner, "First")).toEqual({
      status: "pending_review",
    });
    const items = await db.select().from(schema.reviewItem);
    expect(items.filter((i) => i.type === "opportunity")).toHaveLength(1);
    await approveAll(row.id);
    expect(await post(owner, "Second")).toEqual({ status: "published" });
    const jobs = await db.select().from(schema.job);
    expect(jobs.filter((j) => j.type === "translate")).toHaveLength(1);
  });

  it("reviews every post of an entry the admin marked untrusted", async () => {
    const { owner, row } = await setup();
    await post(owner, "First");
    await approveAll(row.id);
    await db
      .update(schema.entry)
      .set({ trusted: false })
      .where(eq(schema.entry.id, row.id));
    expect(await post(owner, "Second")).toEqual({
      status: "pending_review",
    });
  });

  it("refuses entries that are not published, and people who own none", async () => {
    const { owner } = await setup("suspended");
    expect(await post(owner, "Nope")).toEqual({
      status: "refused",
      code: "entry_not_published",
    });
    const stranger = await addUser(db, "stranger");
    await expect(post(stranger, "Nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows 3 active posts per entry and refuses the fourth", async () => {
    const { owner, row } = await setup();
    await post(owner, "One");
    await approveAll(row.id);
    await post(owner, "Two");
    await post(owner, "Three");
    expect(await post(owner, "Four")).toEqual({
      status: "refused",
      code: "limit_active",
    });
  });

  it("does not count expired or closed posts toward the cap", async () => {
    const { owner, row } = await setup();
    await post(owner, "One");
    await approveAll(row.id);
    await db.update(schema.opportunity).set({
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(Date.now() - 2 * 86_400_000),
    });
    await post(owner, "Two");
    await post(owner, "Three");
    expect(await post(owner, "Four")).toEqual({ status: "published" });
  });

  it("limits a person to 3 new posts a day", async () => {
    const { owner, row } = await setup();
    await post(owner, "One");
    await approveAll(row.id);
    await db
      .update(schema.opportunity)
      .set({ status: "closed", closedAt: new Date() });
    await post(owner, "Two");
    await post(owner, "Three");
    expect(await post(owner, "Four")).toEqual({
      status: "refused",
      code: "limit_daily",
    });
  });

  it("refuses a duplicate title in any case or spacing", async () => {
    const { owner } = await setup();
    await post(owner, "Need a printer");
    expect(await post(owner, "  need   A PRINTER ")).toEqual({
      status: "refused",
      code: "duplicate",
    });
  });

  it("matches duplicates of titles with s and spaces in them", async () => {
    const { owner } = await setup();
    await post(owner, "Tražimo tiskaru za plakate");
    expect(await post(owner, "tražimo  tiskaru za plakate")).toEqual({
      status: "refused",
      code: "duplicate",
    });
  });

  it("refuses a past deadline and tags the person may not use", async () => {
    const { owner } = await setup();
    expect(await post(owner, "Late", { deadline: "2020-01-01" })).toEqual({
      status: "refused",
      code: "bad_deadline",
    });
    const hidden = await addTag(db, "hidden", { status: "rejected" });
    expect(await post(owner, "Tagged", { tagIds: [hidden.id] })).toEqual({
      status: "refused",
      code: "invalid_tags",
    });
  });

  it("stores tags, logs the creation and lists the post for its owner", async () => {
    const { owner } = await setup();
    const tag = await addTag(db, "printing");
    await post(owner, "Tagged", { tagIds: [tag.id] });
    const own = await listOwnOpportunities(owner.id);
    expect(own.items).toHaveLength(1);
    expect(own.items[0]).toMatchObject({ state: "pending", title: "Tagged" });
    expect(own.items[0].values.tagIds).toEqual([tag.id]);
    expect(own.openCount).toBe(1);
    const logs = await db.select().from(schema.changeLog);
    expect(
      logs.filter(
        (l) => l.entityId === own.items[0].id && l.action === "create",
      ),
    ).toHaveLength(1);
  });

  it("refuses dates that match the pattern but are not real days", () => {
    expect(
      opportunityValuesSchema.safeParse({
        ...values("x-valid"),
        body: richTextFromPlain("Body"),
        deadline: "2027-02-30",
      }).success,
    ).toBe(false);
  });

  it("posts to the newest listing, the one the owner area shows", async () => {
    const owner = await addUser(db, "twoentries");
    const older = await addEntry(db, "Older", {}, { ownerUserId: owner.id });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = await addEntry(db, "Newer", {}, { ownerUserId: owner.id });
    await post(owner, "Where does this go");
    const own = await listOwnOpportunities(owner.id);
    expect(own.entry?.id).toBe(newer.id);
    expect(own.items).toHaveLength(1);
    const stored = await db.select().from(schema.opportunity);
    expect(stored.filter((p) => p.entryId === older.id)).toHaveLength(0);
  });

  it("does not let two quick posts across entries pass the daily limit", async () => {
    const owner = await addUser(db, "racer");
    const row = await addEntry(db, "Racer", {}, { ownerUserId: owner.id });
    await post(owner, "Race one");
    await approveAll(row.id);
    await post(owner, "Race two");
    const results = await Promise.all([
      post(owner, "Race three"),
      post(owner, "Race four"),
    ]);
    expect(results.filter((r) => r.status === "refused")).toHaveLength(1);
  });

  it("counts a pending post that ran past its end as closed for the cap, in the list too", async () => {
    const { owner, row } = await setup();
    await post(owner, "Waiting");
    await db
      .update(schema.opportunity)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.opportunity.entryId, row.id));
    const own = await listOwnOpportunities(owner.id);
    expect(own.openCount).toBe(0);
  });

  it("detects Croatian text saved with English chosen, and keeps the choice for short text", async () => {
    const { owner, row } = await setup();
    await post(owner, "Tražimo partnera", {
      body: richTextFromPlain(
        "Vodimo radionice za mlade dizajnere i objavljujemo godišnji časopis o lokalnom obrtu.",
      ),
    });
    await post(owner, "Short", { sourceLocale: "hr" });
    const posts = await db
      .select()
      .from(schema.opportunity)
      .where(eq(schema.opportunity.entryId, row.id));
    const bySource = Object.fromEntries(
      posts.map((p) => [p.title, p.sourceLocale]),
    );
    expect(bySource).toEqual({ "Tražimo partnera": "hr", Short: "hr" });
  });
});
