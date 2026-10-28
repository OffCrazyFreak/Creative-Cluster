import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/errors";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import {
  publicEntryCondition,
  publicLinkCondition,
  publicOpportunityCondition,
} from "../entry/public-entry-filter.server";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("lifecycle") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const admin = await import("./admin-lifecycle.server");
const owner = await import("./owner-lifecycle.server");
const scheduled = await import("./scheduled-lifecycle.server");

describe.skipIf(!temp)("listing lifecycle", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function ownedListing(
    name: string,
    extra: Partial<typeof schema.entry.$inferInsert> = {},
  ) {
    const user = await addUser(db, `${name} owner`);
    const listing = await addEntry(db, name, {}, { ownerUserId: user.id });
    if (Object.keys(extra).length)
      await db
        .update(schema.entry)
        .set(extra)
        .where(eq(schema.entry.id, listing.id));
    return { user, listing };
  }
  async function statusOf(id: string) {
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, id));
    return row;
  }

  it("suspending hides the entry, its posts and its connections, and reinstating restores them", async () => {
    const boss = await addUser(db, "Boss", "admin");
    const { listing } = await ownedListing("Suspend Me");
    const partner = await addEntry(db, "Partner");
    const [post] = await db
      .insert(schema.opportunity)
      .values({
        entryId: listing.id,
        type: "seeking",
        category: "partner",
        title: "Looking",
        body: { type: "doc", content: [] },
        sourceLocale: "en",
        expiresAt: new Date(Date.now() + 86_400_000),
        status: "published",
      })
      .returning();
    const [first, second] = [listing.id, partner.id].sort();
    const [connection] = await db
      .insert(schema.link)
      .values({
        fromId: first,
        toId: second,
        kind: "collaborated",
        symmetric: true,
        status: "confirmed",
      })
      .returning();

    async function visible() {
      return {
        entry: (
          await db
            .select()
            .from(schema.entry)
            .where(and(eq(schema.entry.id, listing.id), publicEntryCondition()))
        ).length,
        post: (
          await db
            .select()
            .from(schema.opportunity)
            .where(
              and(
                eq(schema.opportunity.id, post.id),
                publicOpportunityCondition(),
              ),
            )
        ).length,
        link: (
          await db
            .select()
            .from(schema.link)
            .where(
              and(eq(schema.link.id, connection.id), publicLinkCondition()),
            )
        ).length,
      };
    }
    expect(await visible()).toEqual({ entry: 1, post: 1, link: 1 });

    await admin.suspendEntry(listing.id, "Advertising", boss.id);
    expect(await visible()).toEqual({ entry: 0, post: 0, link: 0 });
    expect((await statusOf(listing.id)).suspendedReason).toBe("Advertising");
    const mails = (await db.select().from(schema.job)).map(
      (j) => j.payload as { template: string },
    );
    expect(mails.map((m) => m.template)).toContain("suspended");
    // The owner sees the reason, and cannot lift the suspension by archiving and restoring.
    const status = await owner.getOwnListingStatus(
      listing.ownerUserId as string,
    );
    expect(status?.suspendedReason).toBe("Advertising");
    await expect(
      owner.archiveOwnListing(listing.ownerUserId as string),
    ).rejects.toBeInstanceOf(NotFoundError);

    await admin.reinstateEntry(listing.id, boss.id);
    expect(await visible()).toEqual({ entry: 1, post: 1, link: 1 });
    expect((await statusOf(listing.id)).suspendedReason).toBeNull();
  });

  it("lets owners archive and show their listing again, but not someone else's", async () => {
    const { user, listing } = await ownedListing("Hide Me");
    const stranger = await addUser(db, "Stranger");
    await expect(owner.archiveOwnListing(stranger.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await owner.archiveOwnListing(user.id);
    expect((await statusOf(listing.id)).status).toBe("archived");
    expect(await owner.unarchiveOwnListing(user.id, false)).toEqual({
      status: "ok",
    });
    expect((await statusOf(listing.id)).status).toBe("published");
  });

  it("blocks showing a listing that is queued for deletion", async () => {
    const { user, listing } = await ownedListing("Deleting", {
      status: "archived",
      erasureRequestedAt: new Date(),
    });
    await expect(
      owner.unarchiveOwnListing(user.id, false),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await statusOf(listing.id)).status).toBe("archived");
  });

  it("unpublishes a person at once on withdrawal and needs consent to publish again", async () => {
    const { user, listing } = await ownedListing("Person", {
      kind: "person",
      consentAt: new Date(),
      consentVersion: "v1",
    });
    await owner.withdrawOwnConsent(user.id);
    const after = await statusOf(listing.id);
    expect(after.status).toBe("archived");
    expect(after.consentAt).toBeNull();
    expect(await owner.unarchiveOwnListing(user.id, false)).toEqual({
      status: "consent_required",
    });
    expect(await owner.unarchiveOwnListing(user.id, true)).toEqual({
      status: "ok",
    });
    expect((await statusOf(listing.id)).consentVersion).toBeTruthy();
  });

  it("stamps the confirmation date and logs it", async () => {
    const { user, listing } = await ownedListing("Confirm Me");
    await owner.confirmOwnListing(user.id);
    expect((await statusOf(listing.id)).lastConfirmedAt).toBeInstanceOf(Date);
    const rows = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, listing.id));
    expect(rows.map((r) => r.action)).toContain("update");
  });

  it("archives unclaimed imports after 12 months and keeps claimed or recent ones", async () => {
    const old = new Date(Date.now() - 400 * 86_400_000);
    const stale = await addEntry(db, "Stale Import");
    const claimed = await ownedListing("Claimed Import", { importedAt: old });
    const recent = await addEntry(db, "Recent Import");
    await db
      .update(schema.entry)
      .set({ importedAt: old })
      .where(eq(schema.entry.id, stale.id));
    await db
      .update(schema.entry)
      .set({ importedAt: new Date() })
      .where(eq(schema.entry.id, recent.id));
    expect(await scheduled.archiveStaleImports()).toBe(1);
    expect((await statusOf(stale.id)).status).toBe("archived");
    expect((await statusOf(claimed.listing.id)).status).toBe("published");
    expect((await statusOf(recent.id)).status).toBe("published");
    const boss = await addUser(db, "Boss2", "admin");
    await admin.restoreEntryAsAdmin(stale.id, boss.id);
    expect((await statusOf(stale.id)).status).toBe("published");
    // The restore restarts the clock, so the next run leaves it alone.
    expect(await scheduled.archiveStaleImports()).toBe(0);
    expect((await statusOf(stale.id)).status).toBe("published");
  });

  it("deletes expired rejected applications and unconfirmed drafts, nothing else", async () => {
    const longAgo = new Date(Date.now() - 100 * 86_400_000);
    const rejected = await addEntry(
      db,
      "Old Rejected",
      {},
      { status: "rejected" },
    );
    const fresh = await addEntry(
      db,
      "Fresh Rejected",
      {},
      { status: "rejected" },
    );
    const draft = await addEntry(db, "Stale Draft", {}, { status: "draft" });
    await db
      .update(schema.entry)
      .set({ updatedAt: longAgo })
      .where(eq(schema.entry.id, rejected.id));
    await db
      .update(schema.entry)
      .set({ updatedAt: longAgo })
      .where(eq(schema.entry.id, draft.id));
    await db.insert(schema.reviewItem).values({
      type: "application",
      entityType: "entry",
      entityId: rejected.id,
    });
    expect(await scheduled.purgeExpiredApplications()).toBe(2);
    expect(
      await db
        .select()
        .from(schema.entry)
        .where(eq(schema.entry.id, rejected.id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(schema.entry).where(eq(schema.entry.id, draft.id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(schema.entry).where(eq(schema.entry.id, fresh.id)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(schema.reviewItem)
        .where(eq(schema.reviewItem.entityId, rejected.id)),
    ).toHaveLength(0);
  });

  it("keeps a suspension from being lifted by an archive and restore round trip", async () => {
    const boss = await addUser(db, "Boss3", "admin");
    const { user, listing } = await ownedListing("Stay Suspended");
    await admin.suspendEntry(listing.id, "Rule break", boss.id);
    await expect(
      admin.archiveEntryAsAdmin(listing.id, boss.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      owner.unarchiveOwnListing(user.id, false),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await statusOf(listing.id)).status).toBe("suspended");
  });

  it("does not publish a person who withdrew consent", async () => {
    const boss = await addUser(db, "Boss4", "admin");
    const { user, listing } = await ownedListing("Withdrawn Person", {
      kind: "person",
      consentAt: new Date(),
      consentVersion: "v1",
    });
    await owner.withdrawOwnConsent(user.id);
    await expect(
      admin.restoreEntryAsAdmin(listing.id, boss.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await statusOf(listing.id)).status).toBe("archived");
  });

  it("keeps a re-verified draft until its new confirm link expires", async () => {
    const recent = await addEntry(
      db,
      "Resubmitted Draft",
      {},
      { status: "draft" },
    );
    await db
      .update(schema.entry)
      .set({ createdAt: new Date(Date.now() - 100 * 86_400_000) })
      .where(eq(schema.entry.id, recent.id));
    await scheduled.purgeExpiredApplications();
    expect(
      await db
        .select()
        .from(schema.entry)
        .where(eq(schema.entry.id, recent.id)),
    ).toHaveLength(1);
  });

  it("keeps an old outside partner stub, which stays a draft for good", async () => {
    const stub = await addEntry(
      db,
      "Outside Partner Stub",
      {},
      { status: "draft" },
    );
    await db
      .update(schema.entry)
      .set({
        kind: "outside_partner",
        updatedAt: new Date(Date.now() - 100 * 86_400_000),
      })
      .where(eq(schema.entry.id, stub.id));
    await scheduled.purgeExpiredApplications();
    expect(
      await db.select().from(schema.entry).where(eq(schema.entry.id, stub.id)),
    ).toHaveLength(1);
  });

  it("leaves a draft alone that was verified after the purge query picked it", async () => {
    const draft = await addEntry(db, "Verified Late", {}, { status: "draft" });
    const { purgeEntry } = await import("./purge-entry.server");
    await db
      .update(schema.entry)
      .set({ status: "pending" })
      .where(eq(schema.entry.id, draft.id));
    const done = await db.transaction((tx) =>
      purgeEntry(tx, draft.id, sql`${schema.entry.status} = 'draft'`),
    );
    expect(done).toBe(false);
    expect((await statusOf(draft.id)).status).toBe("pending");
  });

  it("archives instead of publishing when a suspended person withdrew consent", async () => {
    const boss = await addUser(db, "Boss5", "admin");
    const { user, listing } = await ownedListing("Suspended Person", {
      kind: "person",
      consentAt: new Date(),
      consentVersion: "v1",
    });
    await admin.suspendEntry(listing.id, "spam", boss.id);
    await owner.withdrawOwnConsent(user.id);
    await admin.reinstateEntry(listing.id, boss.id);
    expect((await statusOf(listing.id)).status).toBe("archived");
  });

  it("logs the consent a returning person gave", async () => {
    const { user, listing } = await ownedListing("Consent Logged", {
      kind: "person",
      status: "archived",
    });
    await owner.unarchiveOwnListing(user.id, true);
    const logs = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, listing.id));
    expect(logs.some((l) => l.changedFields?.includes("consentVersion"))).toBe(
      true,
    );
  });
});
