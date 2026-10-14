import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { emptyLocation } from "@/features/location";
import { richTextFromPlain } from "@/lib/rich-text/empty-rich-text";
import { parseRichText } from "@/lib/rich-text/parse-rich-text";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import type { ApplicationInput } from "../apply/apply-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("review") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { createApplication } = await import("../apply/apply.server");
const { verifyApplication } =
  await import("../apply/verify-application.server");
const { decideReviewItems } = await import("./decide-review.server");
const { listReviewItems } = await import("./review-queue.server");
const { createReport } = await import("./report.server");
const { queueReviewDigests } = await import("./review-digest.server");
const { BOUNCE_SOURCE } =
  await import("@/features/contact/bounce-events.server");

function application(name: string, email: string): ApplicationInput {
  return {
    kind: "organization",
    name,
    description: parseRichText(
      richTextFromPlain("We run workshops for schools every week."),
    ),
    contactName: "",
    contactEmail: email,
    contactPhone: "",
    website: null,
    location: { ...emptyLocation("HR"), city: "Zagreb" },
    consent: false,
    ageConfirmed: false,
  };
}

describe.skipIf(!temp)("review services", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function admin() {
    const [row] = await db
      .insert(schema.user)
      .values({
        name: "Admin",
        email: "admin@example.test",
        role: "admin",
        locale: "en",
      })
      .onConflictDoNothing()
      .returning();
    return (
      row ??
      (
        await db
          .select()
          .from(schema.user)
          .where(eq(schema.user.email, "admin@example.test"))
      )[0]
    );
  }

  async function verifiedApplication(name: string, email: string) {
    await createApplication(application(name, email), "en");
    const jobs = await db.select().from(schema.job);
    const mail = jobs
      .map(
        (j) =>
          j.payload as {
            template: string;
            to: string;
            props: { link?: string };
          },
      )
      .filter((p) => p.template === "verify" && p.to === email)
      .at(-1);
    const token =
      new URL(mail?.props.link ?? "http://x").searchParams.get("token") ?? "";
    await verifyApplication(token);
    const [item] = await db
      .select()
      .from(schema.reviewItem)
      .innerJoin(schema.entry, eq(schema.entry.id, schema.reviewItem.entityId))
      .where(eq(schema.entry.name, name));
    return item;
  }

  async function mailsTo(email: string) {
    return (await db.select().from(schema.job))
      .map((j) => j.payload as { template: string; to: string })
      .filter((p) => p.to === email);
  }

  it("approving publishes, creates the owner and mails a set-password link", async () => {
    const boss = await admin();
    const { review_item: item, entry: row } = await verifiedApplication(
      "Approved Place",
      "approved@example.test",
    );
    const [result] = await decideReviewItems(
      { ids: [item.id], decision: "approve" },
      boss.id,
    );
    expect(result.outcome).toBe("ok");
    const [after] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, row.id));
    expect(after.status).toBe("published");
    expect(after.ownerUserId).toBeTruthy();
    const [owner] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "approved@example.test"));
    expect(owner.emailVerified).toBe(true);
    expect(
      (await mailsTo("approved@example.test")).map((m) => m.template),
    ).toContain("approved");
    const tokens = await db.select().from(schema.verification);
    expect(tokens.some((t) => t.identifier.startsWith("reset-password:"))).toBe(
      true,
    );
    // Deciding the same item twice reports it as gone.
    const [again] = await decideReviewItems(
      { ids: [item.id], decision: "approve" },
      boss.id,
    );
    expect(again.outcome).toBe("gone");
  });

  it("rejecting mails the reason and an edit link, except for spam", async () => {
    const boss = await admin();
    const first = await verifiedApplication("Rejected One", "r1@example.test");
    const second = await verifiedApplication(
      "Rejected Spam",
      "r2@example.test",
    );
    const results = await decideReviewItems(
      {
        ids: [first.review_item.id],
        decision: "reject",
        reasonCode: "incomplete",
        note: "Add a website",
      },
      boss.id,
    );
    expect(results[0].outcome).toBe("ok");
    await decideReviewItems(
      { ids: [second.review_item.id], decision: "reject", reasonCode: "spam" },
      boss.id,
    );
    expect((await mailsTo("r1@example.test")).map((m) => m.template)).toContain(
      "rejected",
    );
    expect(
      (await mailsTo("r2@example.test")).map((m) => m.template),
    ).not.toContain("rejected");
    const [entryRow] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, first.entry.id));
    expect(entryRow.status).toBe("rejected");
  });

  it("refuses a rejection without a reason or without the note that other needs", async () => {
    const boss = await admin();
    const item = await verifiedApplication("Needs Reason", "nr@example.test");
    const noReason = await decideReviewItems(
      { ids: [item.review_item.id], decision: "reject" },
      boss.id,
    );
    expect(noReason[0].outcome).toBe("failed");
    const noNote = await decideReviewItems(
      { ids: [item.review_item.id], decision: "reject", reasonCode: "other" },
      boss.id,
    );
    expect(noNote[0].outcome).toBe("failed");
  });

  it("applies an approved sensitive edit, queues translation and ignores fields that are not editable", async () => {
    const boss = await admin();
    const listing = await addEntry(
      db,
      "Trusted Not",
      {},
      { ownerUserId: boss.id },
    );
    const [item] = await db
      .insert(schema.reviewItem)
      .values({
        type: "untrusted_edit",
        entityType: "entry",
        entityId: listing.id,
        payload: {
          patch: {
            name: "Renamed",
            descriptionText: "New words",
            status: "suspended",
            ownerUserId: boss.id,
          },
          tags: { topic: [], offering: [], seeking: [] },
          submittedBy: boss.id,
        },
      })
      .returning();
    const [result] = await decideReviewItems(
      { ids: [item.id], decision: "approve" },
      boss.id,
    );
    expect(result.outcome).toBe("ok");
    const [after] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(after.name).toBe("Renamed");
    expect(after.descriptionText).toBe("New words");
    expect(after.status).toBe("published");
    expect(after.ownerUserId).toBe(boss.id);
    const jobs = (await db.select().from(schema.job)).filter(
      (j) => j.type === "translate",
    );
    expect(jobs.map((j) => j.payload)).toContainEqual({
      entityType: "entry",
      entityId: listing.id,
    });
  });

  it("closes an edit that has nothing editable left without failing", async () => {
    const boss = await admin();
    const listing = await addEntry(db, "Nothing To Do");
    const [item] = await db
      .insert(schema.reviewItem)
      .values({
        type: "untrusted_edit",
        entityType: "entry",
        entityId: listing.id,
        payload: { patch: { status: "suspended" }, submittedBy: boss.id },
      })
      .returning();
    const [result] = await decideReviewItems(
      { ids: [item.id], decision: "approve" },
      boss.id,
    );
    expect(result.outcome).toBe("ok");
  });

  it("refuses to approve an application for a blocked account", async () => {
    const boss = await admin();
    await db.insert(schema.user).values({
      name: "Blocked",
      email: "blocked@example.test",
      locale: "en",
      banned: true,
    });
    const blocked = await verifiedApplication(
      "Blocked Applicant",
      "blocked@example.test",
    );
    const [result] = await decideReviewItems(
      { ids: [blocked.review_item.id], decision: "approve" },
      boss.id,
    );
    expect(result.outcome).toBe("failed");
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, blocked.entry.id));
    expect(row.status).toBe("pending");
  });

  it("reports only public listings and never hides them", async () => {
    const listing = await addEntry(db, "Reported Place");
    const hidden = await addEntry(
      db,
      "Hidden Place",
      {},
      { status: "pending" },
    );
    await createReport({ entryId: listing.id, reason: "spam", message: "ads" });
    await expect(
      createReport({ entryId: hidden.id, reason: "spam", message: "" }),
    ).rejects.toThrow();
    const [after] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(after.status).toBe("published");
    const page = await listReviewItems({ age: "all", page: 1, type: "report" });
    expect(page.rows.map((r) => r.label)).toContain("Reported Place");
  });

  it("filters by age and country and flags stale items", async () => {
    await verifiedApplication("Old Place", "old@example.test");
    await db
      .update(schema.reviewItem)
      .set({ createdAt: new Date(Date.now() - 9 * 86_400_000) })
      .where(eq(schema.reviewItem.entityType, "entry"));
    const stale = await listReviewItems({
      age: "stale",
      page: 1,
      type: "application",
    });
    expect(stale.rows.length).toBeGreaterThan(0);
    expect(stale.rows.every((r) => r.stale)).toBe(true);
    const none = await listReviewItems({ age: "all", page: 1, country: "DE" });
    expect(none.rows).toHaveLength(0);
  });

  it("queues one digest per admin and day, none when nothing is new", async () => {
    await admin();
    const listing = await addEntry(db, "Digest Place");
    await createReport({ entryId: listing.id, reason: "spam", message: "" });
    await queueReviewDigests();
    await queueReviewDigests();
    const digests = (await db.select().from(schema.job)).filter(
      (j) => (j.payload as { template?: string }).template === "report_digest",
    );
    expect(digests).toHaveLength(1);
  });

  it("writes digest lines in each admin's language, opportunity reports included", async () => {
    await admin();
    await db.insert(schema.user).values({
      name: "Admin HR",
      email: "admin-hr@example.test",
      role: "admin",
      locale: "hr",
    });
    const listing = await addEntry(db, "Digest Language Place");
    await createReport({ entryId: listing.id, reason: "spam", message: "" });
    const bounced = await addEntry(db, "Digest Bounce Place");
    const [post] = await db
      .insert(schema.opportunity)
      .values({
        entryId: listing.id,
        type: "seeking",
        category: "partner",
        title: "Digest Post",
        body: { type: "doc", content: [] },
        sourceLocale: "en",
        expiresAt: new Date(Date.now() + 86_400_000),
        status: "published",
      })
      .returning();
    await db.insert(schema.reviewItem).values([
      {
        type: "report",
        entityType: "opportunity",
        entityId: post.id,
        payload: { message: "" },
      },
      {
        type: "report",
        entityType: "entry",
        entityId: bounced.id,
        payload: { reason: "other", source: BOUNCE_SOURCE, message: "" },
      },
    ]);
    await verifiedApplication("Digest Applicant", "digest@example.test");
    await queueReviewDigests();

    const lines = (await db.select().from(schema.job))
      .map(
        (j) =>
          j.payload as {
            template?: string;
            to?: string;
            props?: { items?: { name: string; detail: string }[] };
          },
      )
      .filter((p) => p.template?.endsWith("_digest"))
      .flatMap((p) =>
        (p.props?.items ?? [])
          .filter((item) => item.name.startsWith("Digest"))
          .map((item) => [p.to, item.name, item.detail]),
      );
    expect(lines).toEqual(
      expect.arrayContaining([
        [
          "admin@example.test",
          "Digest Language Place",
          "Spam or advertising, Today",
        ],
        [
          "admin-hr@example.test",
          "Digest Language Place",
          "Neželjeni sadržaj ili reklama, Danas",
        ],
        ["admin@example.test", "Digest Post", "Opportunity, Today"],
        [
          "admin@example.test",
          "Digest Bounce Place",
          "Contact email stopped working, Today",
        ],
        [
          "admin-hr@example.test",
          "Digest Applicant",
          "Organizacija, HR, Danas",
        ],
      ]),
    );
  });

  it("applies and logs only the fields that differ from the live listing", async () => {
    const boss = await admin();
    const listing = await addEntry(db, "Snapshot Same Name");
    const [item] = await db
      .insert(schema.reviewItem)
      .values({
        type: "untrusted_edit",
        entityType: "entry",
        entityId: listing.id,
        payload: {
          patch: {
            name: "Snapshot Same Name",
            website: "https://new.example.test",
          },
          submittedBy: boss.id,
        },
      })
      .returning();
    const page = await listReviewItems({
      age: "all",
      page: 1,
      type: "untrusted_edit",
    });
    expect(page.rows.find((row) => row.id === item.id)?.summary).toBe(
      "website",
    );
    await decideReviewItems({ ids: [item.id], decision: "approve" }, boss.id);
    const logs = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, listing.id));
    expect(logs.map((row) => row.changedFields)).toEqual([["website"]]);
    // A tags-only or website-only edit does not retranslate the unchanged name.
    const jobs = (await db.select().from(schema.job)).filter(
      (j) =>
        j.type === "translate" &&
        (j.payload as { entityId?: string }).entityId === listing.id,
    );
    expect(jobs).toHaveLength(0);
  });

  it("closes a decision whose listing is no longer pending instead of leaving it open", async () => {
    const boss = await admin();
    const stale = await verifiedApplication(
      "Gone Meanwhile",
      "gone@example.test",
    );
    await db
      .update(schema.entry)
      .set({ status: "archived" })
      .where(eq(schema.entry.id, stale.entry.id));
    const [result] = await decideReviewItems(
      { ids: [stale.review_item.id], decision: "approve" },
      boss.id,
    );
    expect(result.outcome).toBe("gone");
    const [item] = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.id, stale.review_item.id));
    expect(item.status).toBe("dismissed");
  });

  it("tells an existing account without a password to set one, not that it was created", async () => {
    const boss = await admin();
    await db
      .insert(schema.user)
      .values({ name: "Old", email: "nopass@example.test", locale: "en" });
    const item = await verifiedApplication(
      "No Password",
      "nopass@example.test",
    );
    await decideReviewItems(
      { ids: [item.review_item.id], decision: "approve" },
      boss.id,
    );
    const mail = (await db.select().from(schema.job))
      .map(
        (j) =>
          j.payload as {
            template: string;
            to: string;
            props: { newAccount?: boolean; needsPassword?: boolean };
          },
      )
      .find((p) => p.template === "approved" && p.to === "nopass@example.test");
    expect(mail?.props).toMatchObject({
      newAccount: false,
      needsPassword: true,
    });
  });
});
