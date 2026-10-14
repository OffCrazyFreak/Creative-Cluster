import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/errors";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import { addOpportunity } from "../../../tests/helpers/opportunity-fixtures";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("opp_decide") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { decideOpportunity } = await import("./decide-opportunity.server");
const { removeOpportunity } = await import("./remove-opportunity.server");

describe.skipIf(!temp)("opportunity decisions", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function setup(status: "pending" | "published" = "pending") {
    const owner = await addUser(db, "owner");
    const admin = await addUser(db, "admin", "admin");
    const row = await addEntry(db, "Studio", {}, { ownerUserId: owner.id });
    const post = await addOpportunity(db, row.id, { status });
    await db.insert(schema.reviewItem).values({
      type: "opportunity",
      entityType: "opportunity",
      entityId: post.id,
    });
    return { owner, admin, post };
  }
  async function templates() {
    const jobs = await db.select().from(schema.job);
    return jobs
      .filter((j) => j.type === "email")
      .map((j) => (j.payload as { template: string }).template);
  }
  async function reload(id: string) {
    const [row] = await db
      .select()
      .from(schema.opportunity)
      .where(eq(schema.opportunity.id, id));
    return row;
  }

  it("publishes on approval, closes the review item, mails and translates", async () => {
    const { admin, post } = await setup();
    const before = (await templates()).length;
    const outcome = await db.transaction((tx) =>
      decideOpportunity(tx, { id: post.id, approve: true, adminId: admin.id }),
    );
    expect(outcome).toBe("published");
    const row = await reload(post.id);
    expect(row.status).toBe("published");
    expect(row.publishedAt).not.toBeNull();
    const [item] = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, post.id));
    expect(item).toMatchObject({ status: "approved", decidedBy: admin.id });
    expect(await templates()).toHaveLength(before + 1);
    const jobs = await db.select().from(schema.job);
    expect(jobs.some((j) => j.type === "translate")).toBe(true);
    const logs = await db.select().from(schema.changeLog);
    expect(
      logs.some((l) => l.entityId === post.id && l.source === "admin"),
    ).toBe(true);
  });

  it("rejects with a reason and mails the owner", async () => {
    const { admin, post } = await setup();
    await db.transaction((tx) =>
      decideOpportunity(tx, {
        id: post.id,
        approve: false,
        reasonCode: "incomplete",
        note: "Add a city",
        adminId: admin.id,
      }),
    );
    expect((await reload(post.id)).status).toBe("rejected");
    const [item] = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, post.id));
    expect(item).toMatchObject({
      status: "rejected",
      reasonCode: "incomplete",
      noteToApplicant: "Add a city",
    });
    expect(await templates()).toContain("opportunity_rejected");
  });

  it("sends no mail for spam", async () => {
    const { admin, post } = await setup();
    const before = (await templates()).length;
    await db.transaction((tx) =>
      decideOpportunity(tx, {
        id: post.id,
        approve: false,
        reasonCode: "spam",
        adminId: admin.id,
      }),
    );
    expect(await templates()).toHaveLength(before);
  });

  it("needs a reason to reject, and a note for the reason other", async () => {
    const { admin, post } = await setup();
    await expect(
      db.transaction((tx) =>
        decideOpportunity(tx, {
          id: post.id,
          approve: false,
          adminId: admin.id,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      db.transaction((tx) =>
        decideOpportunity(tx, {
          id: post.id,
          approve: false,
          reasonCode: "other",
          adminId: admin.id,
        }),
      ),
    ).rejects.toThrow();
    expect((await reload(post.id)).status).toBe("pending");
  });

  it("only decides posts that are waiting", async () => {
    const { admin, post } = await setup("published");
    await expect(
      db.transaction((tx) =>
        decideOpportunity(tx, {
          id: post.id,
          approve: true,
          adminId: admin.id,
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("removes a post with a statement of reasons, even for spam, and settles its reports", async () => {
    const { admin, post } = await setup("published");
    await db.insert(schema.reviewItem).values({
      type: "report",
      entityType: "opportunity",
      entityId: post.id,
    });
    await db.transaction((tx) =>
      removeOpportunity(tx, {
        id: post.id,
        reasonCode: "spam",
        adminId: admin.id,
      }),
    );
    const row = await reload(post.id);
    expect(row).toMatchObject({ status: "removed", closedReason: "spam" });
    expect(await templates()).toContain("opportunity_removed");
    const items = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, post.id));
    expect(items.every((i) => i.status !== "open")).toBe(true);
  });
});
