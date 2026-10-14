import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/errors";
import { formatDate } from "@/utils/format-date";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import { addOpportunity } from "../../../tests/helpers/opportunity-fixtures";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("opp_decide") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { decideOpportunity } = await import("./decide-opportunity.server");
const { OpportunityDeadlinePassedError, OpportunityLimitError } =
  await import("./opportunity-errors");
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
  async function approvalMail(postId: string) {
    const jobs = await db.select().from(schema.job);
    return jobs.find((j) => {
      const payload = j.payload as {
        template?: string;
        props?: { link?: string };
      };
      return (
        payload.template === "opportunity_approved" &&
        payload.props?.link?.includes(postId)
      );
    })!;
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
    const removed = (await db.select().from(schema.job)).find(
      (j) =>
        (j.payload as { template?: string }).template === "opportunity_removed",
    );
    // The mail invites the owner to reply, so replies must reach a monitored address.
    expect((removed?.payload as { replyTo?: string }).replyTo).toBeTruthy();
    const items = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, post.id));
    expect(items.every((i) => i.status !== "open")).toBe(true);
  });

  it("will not approve a post whose deadline passed while it waited", async () => {
    const { admin, post } = await setup();
    await db
      .update(schema.opportunity)
      .set({ deadline: "2020-01-01" })
      .where(eq(schema.opportunity.id, post.id));
    await expect(
      db.transaction((tx) =>
        decideOpportunity(tx, {
          id: post.id,
          approve: true,
          adminId: admin.id,
        }),
      ),
    ).rejects.toBeInstanceOf(OpportunityDeadlinePassedError);
    expect((await reload(post.id)).status).toBe("pending");
  });

  it("keeps the period of a post that was approved before", async () => {
    const { admin, post } = await setup();
    const kept = new Date(Date.now() + 5 * 86_400_000);
    await db
      .update(schema.opportunity)
      .set({ publishedAt: new Date(Date.now() - 86_400_000), expiresAt: kept })
      .where(eq(schema.opportunity.id, post.id));
    await db.transaction((tx) =>
      decideOpportunity(tx, { id: post.id, approve: true, adminId: admin.id }),
    );
    const row = await reload(post.id);
    expect(row.status).toBe("published");
    expect(row.expiresAt.getTime()).toBe(kept.getTime());
  });

  it("will not re-approve a previously approved post that ran out", async () => {
    const { admin, post } = await setup();
    await db
      .update(schema.opportunity)
      .set({
        publishedAt: new Date(Date.now() - 20 * 86_400_000),
        expiresAt: new Date(Date.now() - 86_400_000),
      })
      .where(eq(schema.opportunity.id, post.id));
    await expect(
      db.transaction((tx) =>
        decideOpportunity(tx, {
          id: post.id,
          approve: true,
          adminId: admin.id,
        }),
      ),
    ).rejects.toBeInstanceOf(OpportunityDeadlinePassedError);
  });

  it("will not publish a lapsed waiting post over the entry cap", async () => {
    const owner = await addUser(db, "capowner");
    const admin = await addUser(db, "capadmin", "admin");
    const row = await addEntry(db, "Capped", {}, { ownerUserId: owner.id });
    for (let i = 0; i < 3; i++)
      await addOpportunity(db, row.id, {
        status: "published",
        publishedAt: new Date(),
        title: `Live ${i}`,
      });
    const lapsed = await addOpportunity(db, row.id, {
      expiresAt: new Date(Date.now() - 1000),
      title: "Lapsed",
    });
    await expect(
      db.transaction((tx) =>
        decideOpportunity(tx, {
          id: lapsed.id,
          approve: true,
          adminId: admin.id,
        }),
      ),
    ).rejects.toBeInstanceOf(OpportunityLimitError);
    expect((await reload(lapsed.id)).status).toBe("pending");
  });

  it("tells the owner the last open day, not the day after", async () => {
    const { admin, post } = await setup();
    const deadline = new Date(Date.now() + 10 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await db
      .update(schema.opportunity)
      .set({ deadline })
      .where(eq(schema.opportunity.id, post.id));
    await db.transaction((tx) =>
      decideOpportunity(tx, { id: post.id, approve: true, adminId: admin.id }),
    );
    const mail = await approvalMail(post.id);
    const payload = mail.payload as {
      props: { expiresAt: string; publishedAtOnce: boolean };
    };
    expect(payload.props.expiresAt).toBe(formatDate(deadline, "en"));
  });

  it("does not promise instant publishing for an entry set to review", async () => {
    const { admin, post } = await setup();
    await db
      .update(schema.entry)
      .set({ trusted: false })
      .where(eq(schema.entry.id, post.entryId));
    await db.transaction((tx) =>
      decideOpportunity(tx, { id: post.id, approve: true, adminId: admin.id }),
    );
    const mail = await approvalMail(post.id);
    expect(
      (mail.payload as { props: { publishedAtOnce: boolean } }).props
        .publishedAtOnce,
    ).toBe(false);
  });

  it("settles a waiting review as rejected and a report as acted on when removing", async () => {
    const { admin, post } = await setup("pending");
    await db.insert(schema.reviewItem).values({
      type: "report",
      entityType: "opportunity",
      entityId: post.id,
    });
    await db.transaction((tx) =>
      removeOpportunity(tx, {
        id: post.id,
        reasonCode: "out_of_scope",
        adminId: admin.id,
      }),
    );
    const items = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, post.id));
    expect(items.find((i) => i.type === "opportunity")).toMatchObject({
      status: "rejected",
      reasonCode: "out_of_scope",
    });
    expect(items.find((i) => i.type === "report")).toMatchObject({
      status: "approved",
      reasonCode: "out_of_scope",
    });
  });

  it("says so when an entry without an account cannot be mailed", async () => {
    const admin = await addUser(db, "admin", "admin");
    const row = await addEntry(db, "Unclaimed");
    const post = await addOpportunity(db, row.id, { status: "published" });
    const result = await db.transaction((tx) =>
      removeOpportunity(tx, {
        id: post.id,
        reasonCode: "spam",
        adminId: admin.id,
      }),
    );
    expect(result).toEqual({ emailed: false });
  });
});
