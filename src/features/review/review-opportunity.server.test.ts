import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import { addOpportunity } from "../../../tests/helpers/opportunity-fixtures";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("review_opp") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { decideReviewItems } = await import("./decide-review.server");
const { listReviewItems } = await import("./review-queue.server");

describe.skipIf(!temp)("review queue opportunity items", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function queue(
    status: "pending" | "published",
    type: string,
    options: {
      withOwner?: boolean;
      post?: Partial<typeof schema.opportunity.$inferInsert>;
      country?: string;
    } = {},
  ) {
    const { withOwner = true, post: overrides, country } = options;
    const owner = withOwner
      ? await addUser(db, `owner-${Math.random()}`)
      : null;
    const admin = await addUser(db, `admin-${Math.random()}`, "admin");
    const row = await addEntry(db, "Studio", {}, { ownerUserId: owner?.id });
    if (country)
      await db
        .update(schema.entry)
        .set({ countryCode: country })
        .where(eq(schema.entry.id, row.id));
    const post = await addOpportunity(db, row.id, { status, ...overrides });
    const [item] = await db
      .insert(schema.reviewItem)
      .values({
        type: type as "opportunity" | "report",
        entityType: "opportunity",
        entityId: post.id,
        payload: type === "report" ? { message: "Looks wrong" } : {},
      })
      .returning();
    return { admin, post, item };
  }
  async function postStatus(id: string) {
    const [row] = await db
      .select()
      .from(schema.opportunity)
      .where(eq(schema.opportunity.id, id));
    return row.status;
  }

  it("lists a pending post as a decidable item with its text", async () => {
    const { item } = await queue("pending", "opportunity");
    const page = await listReviewItems({ age: "all", page: 1 });
    const row = page.rows.find((r) => r.id === item.id);
    expect(row).toMatchObject({
      type: "opportunity",
      entityType: "opportunity",
      decidable: true,
      postedBy: "Studio",
    });
    expect(row?.label).not.toBe("");
  });

  it("approves a pending post", async () => {
    const { admin, post, item } = await queue("pending", "opportunity");
    const [result] = await decideReviewItems(
      { ids: [item.id], decision: "approve" },
      admin.id,
    );
    expect(result.outcome).toBe("ok");
    expect(await postStatus(post.id)).toBe("published");
  });

  it("rejects a pending post only with a reason", async () => {
    const { admin, post, item } = await queue("pending", "opportunity");
    const [missing] = await decideReviewItems(
      { ids: [item.id], decision: "reject" },
      admin.id,
    );
    expect(missing.outcome).toBe("failed");
    expect(await postStatus(post.id)).toBe("pending");
    const [done] = await decideReviewItems(
      { ids: [item.id], decision: "reject", reasonCode: "incomplete" },
      admin.id,
    );
    expect(done.outcome).toBe("ok");
    expect(await postStatus(post.id)).toBe("rejected");
  });

  it("dismisses a report on a post and leaves the post up", async () => {
    const { admin, post, item } = await queue("published", "report");
    const [result] = await decideReviewItems(
      { ids: [item.id], decision: "reject" },
      admin.id,
    );
    expect(result.outcome).toBe("ok");
    expect(await postStatus(post.id)).toBe("published");
    const [after] = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.id, item.id));
    expect(after.status).toBe("dismissed");
  });

  it("removes the post when a report is acted on, and needs a reason", async () => {
    const { admin, post, item } = await queue("published", "report");
    const [missing] = await decideReviewItems(
      { ids: [item.id], decision: "approve" },
      admin.id,
    );
    expect(missing.outcome).toBe("failed");
    const [done] = await decideReviewItems(
      { ids: [item.id], decision: "approve", reasonCode: "spam" },
      admin.id,
    );
    expect(done.outcome).toBe("ok");
    expect(await postStatus(post.id)).toBe("removed");
  });

  it("marks a bounce report as automatic and shows only its message", async () => {
    const row = await addEntry(db, "Bounced Studio");
    const [item] = await db
      .insert(schema.reviewItem)
      .values({
        type: "report",
        entityType: "entry",
        entityId: row.id,
        payload: {
          reason: "other",
          message: "Mail bounced",
          source: "email_webhook",
        },
      })
      .returning();
    const page = await listReviewItems({ age: "all", page: 1 });
    const listed = page.rows.find((r) => r.id === item.id);
    expect(listed).toMatchObject({ automatic: true, summary: "Mail bounced" });
  });

  it("reports a post whose deadline passed while it waited and keeps it pending", async () => {
    const { admin, post, item } = await queue("pending", "opportunity", {
      post: { deadline: "2020-01-01" },
    });
    const [result] = await decideReviewItems(
      { ids: [item.id], decision: "approve" },
      admin.id,
    );
    expect(result.outcome).toBe("expired");
    expect(await postStatus(post.id)).toBe("pending");
    const [after] = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.id, item.id));
    expect(after.status).toBe("open");
  });

  it("says when a removed post's entry has no account to email", async () => {
    const { admin, post, item } = await queue("published", "report", {
      withOwner: false,
    });
    const [result] = await decideReviewItems(
      { ids: [item.id], decision: "approve", reasonCode: "spam" },
      admin.id,
    );
    expect(result.outcome).toBe("no_account");
    expect(await postStatus(post.id)).toBe("removed");
  });

  it("filters opportunity items by the country of the posting entry", async () => {
    const { item } = await queue("pending", "opportunity", { country: "HR" });
    const inCountry = await listReviewItems({
      age: "all",
      page: 1,
      country: "hr",
    });
    const row = inCountry.rows.find((r) => r.id === item.id);
    expect(row?.countryCode).toBe("HR");
    const elsewhere = await listReviewItems({
      age: "all",
      page: 1,
      country: "de",
    });
    expect(elsewhere.rows.some((r) => r.id === item.id)).toBe(false);
    expect(inCountry.total).toBeGreaterThan(0);
  });

  it("shows the whole post text, with the reporter's message on a report", async () => {
    const long = "word ".repeat(150);
    const { item } = await queue("published", "report", {
      post: { bodyText: long },
    });
    const page = await listReviewItems({ age: "all", page: 1 });
    const row = page.rows.find((r) => r.id === item.id);
    expect(row?.summary).toContain("Looks wrong");
    expect(row?.summary.length).toBeGreaterThan(700);
  });
});
