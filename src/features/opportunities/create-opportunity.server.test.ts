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
    row: { id: string },
    title: string,
    overrides: Partial<OpportunityFormValues> = {},
  ) {
    return createOpportunity({
      entryId: row.id,
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
    expect(await post(owner, row, "First")).toEqual({
      status: "pending_review",
    });
    const items = await db.select().from(schema.reviewItem);
    expect(items.filter((i) => i.type === "opportunity")).toHaveLength(1);
    await approveAll(row.id);
    expect(await post(owner, row, "Second")).toEqual({ status: "published" });
    const jobs = await db.select().from(schema.job);
    expect(jobs.filter((j) => j.type === "translate")).toHaveLength(1);
  });

  it("reviews every post of an entry the admin marked untrusted", async () => {
    const { owner, row } = await setup();
    await post(owner, row, "First");
    await approveAll(row.id);
    await db
      .update(schema.entry)
      .set({ trusted: false })
      .where(eq(schema.entry.id, row.id));
    expect(await post(owner, row, "Second")).toEqual({
      status: "pending_review",
    });
  });

  it("refuses entries that are not published, and other people's entries", async () => {
    const { owner, row } = await setup("suspended");
    expect(await post(owner, row, "Nope")).toEqual({
      status: "refused",
      code: "entry_not_published",
    });
    const stranger = await addUser(db, "stranger");
    await expect(post(stranger, row, "Nope")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("allows 3 active posts per entry and refuses the fourth", async () => {
    const { owner, row } = await setup();
    await post(owner, row, "One");
    await approveAll(row.id);
    await post(owner, row, "Two");
    await post(owner, row, "Three");
    expect(await post(owner, row, "Four")).toEqual({
      status: "refused",
      code: "limit_active",
    });
  });

  it("does not count expired or closed posts toward the cap", async () => {
    const { owner, row } = await setup();
    await post(owner, row, "One");
    await approveAll(row.id);
    await db.update(schema.opportunity).set({
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(Date.now() - 2 * 86_400_000),
    });
    await post(owner, row, "Two");
    await post(owner, row, "Three");
    expect(await post(owner, row, "Four")).toEqual({ status: "published" });
  });

  it("limits a person to 3 new posts a day", async () => {
    const { owner, row } = await setup();
    await post(owner, row, "One");
    await approveAll(row.id);
    await db
      .update(schema.opportunity)
      .set({ status: "closed", closedAt: new Date() });
    await post(owner, row, "Two");
    await post(owner, row, "Three");
    expect(await post(owner, row, "Four")).toEqual({
      status: "refused",
      code: "limit_daily",
    });
  });

  it("refuses a duplicate title in any case or spacing", async () => {
    const { owner, row } = await setup();
    await post(owner, row, "Need a printer");
    expect(await post(owner, row, "  need   A PRINTER ")).toEqual({
      status: "refused",
      code: "duplicate",
    });
  });

  it("refuses a past deadline and tags the person may not use", async () => {
    const { owner, row } = await setup();
    expect(await post(owner, row, "Late", { deadline: "2020-01-01" })).toEqual({
      status: "refused",
      code: "bad_deadline",
    });
    const hidden = await addTag(db, "hidden", { status: "rejected" });
    expect(await post(owner, row, "Tagged", { tagIds: [hidden.id] })).toEqual({
      status: "refused",
      code: "invalid_tags",
    });
  });

  it("stores tags, logs the creation and lists the post for its owner", async () => {
    const { owner, row } = await setup();
    const tag = await addTag(db, "printing");
    await post(owner, row, "Tagged", { tagIds: [tag.id] });
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
});
