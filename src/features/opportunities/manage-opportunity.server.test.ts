import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { richTextFromPlain } from "@/lib/rich-text/empty-rich-text";
import { NotFoundError } from "@/server/errors";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import { addOpportunity } from "../../../tests/helpers/opportunity-fixtures";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import {
  opportunityValuesSchema,
  renewOpportunityInput,
  type OpportunityFormValues,
} from "./opportunity-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("opp_manage") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { updateOpportunity } = await import("./update-opportunity.server");
const { renewOpportunity } = await import("./renew-opportunity.server");
const { markOpportunityFilled } = await import("./close-opportunity.server");
const { listOwnOpportunities } = await import("./own-opportunities.server");

const DAY = 86_400_000;

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

function isoDay(offsetDays: number) {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}

describe.skipIf(!temp)("managing a post", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function setup(overrides = {}) {
    const owner = await addUser(db, "owner");
    const row = await addEntry(db, "Studio", {}, { ownerUserId: owner.id });
    const post = await addOpportunity(db, row.id, {
      status: "published",
      publishedAt: new Date(),
      ...overrides,
    });
    return { owner, row, post };
  }
  async function reload(id: string) {
    const [row] = await db
      .select()
      .from(schema.opportunity)
      .where(eq(schema.opportunity.id, id));
    return row;
  }
  function expireAt(id: string, at: Date) {
    return db
      .update(schema.opportunity)
      .set({ expiresAt: at })
      .where(eq(schema.opportunity.id, id));
  }

  it("edits a live post without review, logs it and queues a translation", async () => {
    const { owner, post } = await setup();
    const result = await updateOpportunity({
      id: post.id,
      userId: owner.id,
      values: values("Edited title"),
    });
    expect(result).toEqual({ status: "saved" });
    expect((await reload(post.id)).title).toBe("Edited title");
    const logs = await db.select().from(schema.changeLog);
    const update = logs.find((l) => l.entityId === post.id);
    expect(update?.changedFields).toContain("title");
    const jobs = await db.select().from(schema.job);
    expect(jobs.some((j) => j.type === "translate")).toBe(true);
  });

  it("does nothing when nothing changed", async () => {
    const { owner, post } = await setup();
    const same = values("Need a partner", {
      body: richTextFromPlain("Body"),
    });
    const result = await updateOpportunity({
      id: post.id,
      userId: owner.id,
      values: same,
    });
    expect(result).toEqual({ status: "unchanged" });
    const logs = await db.select().from(schema.changeLog);
    expect(logs.filter((l) => l.entityId === post.id)).toHaveLength(0);
  });

  it("hides other people's posts behind not found", async () => {
    const { post } = await setup();
    const stranger = await addUser(db, "stranger");
    await expect(
      updateOpportunity({
        id: post.id,
        userId: stranger.id,
        values: values("Mine now"),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses an edited deadline the post would not live to see", async () => {
    const { owner, post } = await setup();
    expect(
      await updateOpportunity({
        id: post.id,
        userId: owner.id,
        values: values("Need a partner", { deadline: isoDay(150) }),
      }),
    ).toEqual({ status: "refused", code: "bad_deadline" });
    const after = await reload(post.id);
    expect(after.expiresAt).toEqual(post.expiresAt);
    expect(after.deadline).toBeNull();
    expect(
      await updateOpportunity({
        id: post.id,
        userId: owner.id,
        values: values("Need a partner", { deadline: isoDay(30) }),
      }),
    ).toEqual({ status: "saved" });
  });

  it("sends an edited rejected post back to review", async () => {
    const { owner, post } = await setup({
      status: "rejected",
      publishedAt: null,
    });
    const result = await updateOpportunity({
      id: post.id,
      userId: owner.id,
      values: values("Fixed up"),
    });
    expect(result).toEqual({ status: "pending_review" });
    expect((await reload(post.id)).status).toBe("pending");
    const items = await db.select().from(schema.reviewItem);
    expect(
      items.some((i) => i.entityId === post.id && i.status === "open"),
    ).toBe(true);
  });

  it("refuses edits to closed posts", async () => {
    const { owner, post } = await setup({ status: "closed" });
    expect(
      await updateOpportunity({
        id: post.id,
        userId: owner.id,
        values: values("Too late"),
      }),
    ).toEqual({ status: "refused", code: "not_editable" });
  });

  it("renews only in the last 8 days or after expiry, at most 3 times", async () => {
    const { owner, post } = await setup();
    expect(await renewOpportunity({ id: post.id, userId: owner.id })).toEqual({
      status: "refused",
      code: "not_renewable",
    });
    for (let round = 1; round <= 3; round += 1) {
      await expireAt(post.id, new Date(Date.now() - 1000));
      expect(await renewOpportunity({ id: post.id, userId: owner.id })).toEqual(
        {
          status: "saved",
        },
      );
    }
    await expireAt(post.id, new Date(Date.now() - 1000));
    expect(await renewOpportunity({ id: post.id, userId: owner.id })).toEqual({
      status: "refused",
      code: "not_renewable",
    });
    expect((await reload(post.id)).renewals).toBe(3);
  });

  it("keeps the remaining days when renewing early", async () => {
    const { owner, post } = await setup();
    const end = new Date(Date.now() + 5 * DAY);
    await expireAt(post.id, end);
    await renewOpportunity({ id: post.id, userId: owner.id });
    expect((await reload(post.id)).expiresAt.getTime()).toBe(
      end.getTime() + 60 * DAY,
    );
  });

  it("needs a later deadline to renew a post that has one", async () => {
    const { owner, post } = await setup({
      deadline: isoDay(3),
      expiresAt: new Date(Date.now() + 4 * DAY),
    });
    expect(await renewOpportunity({ id: post.id, userId: owner.id })).toEqual({
      status: "refused",
      code: "bad_deadline",
    });
    expect(
      await renewOpportunity({
        id: post.id,
        userId: owner.id,
        deadline: isoDay(40),
      }),
    ).toEqual({ status: "saved" });
  });

  it("will not revive an expired post when the entry already has 3 open ones", async () => {
    const { owner, row, post } = await setup({
      expiresAt: new Date(Date.now() - 1000),
    });
    for (const title of ["A", "B", "C"])
      await addOpportunity(db, row.id, { title, status: "published" });
    expect(await renewOpportunity({ id: post.id, userId: owner.id })).toEqual({
      status: "refused",
      code: "limit_active",
    });
  });

  it("marks a post filled once and lists it as filled", async () => {
    const { owner, post } = await setup();
    await markOpportunityFilled(post.id, owner.id);
    const own = await listOwnOpportunities(owner.id);
    expect(own.items.find((i) => i.id === post.id)?.state).toBe("filled");
    expect((await reload(post.id)).closedReason).toBe("filled");
    await expect(
      markOpportunityFilled(post.id, owner.id),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("takes a live post offline for review when its text changes on an entry set to review", async () => {
    const { owner, row, post } = await setup();
    await db
      .update(schema.entry)
      .set({ trusted: false })
      .where(eq(schema.entry.id, row.id));
    const remote = await updateOpportunity({
      id: post.id,
      userId: owner.id,
      values: values("Need a partner", {
        body: richTextFromPlain("Body"),
        remoteOk: true,
      }),
    });
    expect(remote).toEqual({ status: "saved" });
    expect((await reload(post.id)).status).toBe("published");
    const text = await updateOpportunity({
      id: post.id,
      userId: owner.id,
      values: values("A new title", { body: richTextFromPlain("Body") }),
    });
    expect(text).toEqual({ status: "pending_review" });
    expect((await reload(post.id)).status).toBe("pending");
  });

  it("will not resubmit a rejected post when the entry already has 3 open ones", async () => {
    const { owner, row, post } = await setup({
      status: "rejected",
      publishedAt: null,
    });
    for (const title of ["A", "B", "C"])
      await addOpportunity(db, row.id, { title, status: "published" });
    expect(
      await updateOpportunity({
        id: post.id,
        userId: owner.id,
        values: values("Fixed up"),
      }),
    ).toEqual({ status: "refused", code: "limit_active" });
    expect((await reload(post.id)).status).toBe("rejected");
  });

  it("lets an expired post with a past deadline be edited when the deadline is left alone", async () => {
    const { owner, post } = await setup({
      deadline: "2026-01-01",
      expiresAt: new Date(Date.now() - DAY),
    });
    expect(
      await updateOpportunity({
        id: post.id,
        userId: owner.id,
        values: values("Typo fixed", { deadline: "2026-01-01" }),
      }),
    ).toEqual({ status: "saved" });
    expect(
      await updateOpportunity({
        id: post.id,
        userId: owner.id,
        values: values("Typo fixed", { deadline: "2026-01-02" }),
      }),
    ).toEqual({ status: "refused", code: "bad_deadline" });
  });

  it("refuses a renewal deadline that is not a real day", () => {
    expect(
      renewOpportunityInput.safeParse({
        id: "0198a2c4-0000-7000-8000-000000000000",
        deadline: "2026-13-45",
      }).success,
    ).toBe(false);
  });

  it("lets only one of two quick renewals revive posts past the cap", async () => {
    const { owner, row, post } = await setup({
      expiresAt: new Date(Date.now() - 1000),
    });
    const second = await addOpportunity(db, row.id, {
      title: "Second",
      status: "published",
      expiresAt: new Date(Date.now() - 1000),
    });
    for (const title of ["A", "B"])
      await addOpportunity(db, row.id, { title, status: "published" });
    const results = await Promise.all([
      renewOpportunity({ id: post.id, userId: owner.id }),
      renewOpportunity({ id: second.id, userId: owner.id }),
    ]);
    expect(results.filter((r) => r.status === "saved")).toHaveLength(1);
  });

  it("detects the language when the text changes and keeps a manual correction after", async () => {
    const { owner, post } = await setup();
    const croatian = {
      body: richTextFromPlain(
        "Vodimo radionice za mlade dizajnere i objavljujemo godišnji časopis o lokalnom obrtu.",
      ),
    };
    await updateOpportunity({
      id: post.id,
      userId: owner.id,
      values: values("Tražimo partnera", croatian),
    });
    expect((await reload(post.id)).sourceLocale).toBe("hr");

    await updateOpportunity({
      id: post.id,
      userId: owner.id,
      values: values("Tražimo partnera", {
        ...croatian,
        sourceLocale: "en",
        remoteOk: true,
      }),
    });
    expect((await reload(post.id)).sourceLocale).toBe("en");
  });
});
