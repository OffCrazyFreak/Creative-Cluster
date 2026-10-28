import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("admin_entry_ops") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/features/directory/map-directory.server", () => ({
  invalidateMapDirectory: () => undefined,
}));
const { transferOwner } = await import("./transfer-owner.server");
const { mergePartner } = await import("./merge-partner.server");
const { movePin } = await import("./move-pin.server");
const { changeSlug } = await import("./change-slug.server");
const { getAdminEntryDetail } = await import("./entry-detail.server");
const { exportEntries } = await import("./export-entries.server");

describe.skipIf(!temp)("admin entry operations", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function changesOf(entityId: string) {
    return db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, entityId));
  }

  it("transfers the owner, logs it, and refuses an owner who already has a listing", async () => {
    const boss = await addUser(db, "Boss", "admin");
    const first = await addUser(db, "First");
    const second = await addUser(db, "Second");
    const listing = await addEntry(
      db,
      "Move Owner",
      {},
      { ownerUserId: first.id },
    );
    await addEntry(db, "Busy", {}, { ownerUserId: second.id });
    const free = await addUser(db, "Free");

    expect(await transferOwner(listing.id, second.id, boss.id)).toEqual({
      ok: false,
      error: "owner_has_entry",
    });
    expect(await transferOwner(listing.id, free.id, boss.id)).toEqual({
      ok: true,
    });
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(row.ownerUserId).toBe(free.id);
    const log = await changesOf(listing.id);
    expect(log.at(-1)).toMatchObject({
      source: "admin",
      changedFields: ["ownerUserId"],
    });
  });

  it("merges a stub: links move to the target, duplicates and self links are dropped, the stub is gone", async () => {
    const boss = await addUser(db, "Boss", "admin");
    const target = await addEntry(db, "Real Org");
    const other = await addEntry(db, "Other Org");
    const third = await addEntry(db, "Third Org");
    const [stub] = await db
      .insert(schema.entry)
      .values({
        slug: "stub-partner",
        kind: "outside_partner",
        status: "draft",
        name: "Stub Partner",
        sourceLocale: "en",
      })
      .returning();
    function pair(a: string, b: string) {
      return a < b ? [a, b] : [b, a];
    }
    const [s1, s2] = pair(other.id, stub.id);
    const [t1, t2] = pair(other.id, target.id);
    const [u1, u2] = pair(third.id, stub.id);
    function insert(
      fromId: string,
      toId: string,
      status: "confirmed" | "proposed",
    ) {
      return db
        .insert(schema.link)
        .values({ fromId, toId, kind: "collaborated", symmetric: true, status })
        .returning();
    }
    const [dupStub] = await insert(s1, s2, "confirmed");
    await insert(t1, t2, "confirmed");
    const [moved] = await insert(u1, u2, "confirmed");
    const [selfy] = await db
      .insert(schema.link)
      .values({
        fromId: stub.id,
        toId: target.id,
        kind: "supplier",
        symmetric: false,
        status: "confirmed",
      })
      .returning();

    expect(await mergePartner(target.id, stub.id, boss.id)).toEqual({
      ok: false,
      error: "not_a_stub",
    });
    expect(await mergePartner(stub.id, target.id, boss.id)).toEqual({
      ok: true,
    });

    const [gone] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, stub.id));
    expect(gone).toBeUndefined();
    const left = await db
      .select({
        id: schema.link.id,
        from: schema.link.fromId,
        to: schema.link.toId,
      })
      .from(schema.link)
      .where(and(eq(schema.link.kind, "collaborated")));
    const ids = left.map((l) => l.id);
    expect(ids).toContain(moved.id);
    expect(ids).not.toContain(dupStub.id);
    const movedRow = left.find((l) => l.id === moved.id);
    expect([movedRow?.from, movedRow?.to].sort()).toEqual(
      [third.id, target.id].sort(),
    );
    const survivors = await db
      .select({ id: schema.link.id })
      .from(schema.link)
      .where(eq(schema.link.id, selfy.id));
    expect(survivors).toEqual([]);
    expect((await changesOf(target.id)).at(-1)?.after).toMatchObject({
      mergedPartner: "Stub Partner",
      linksMoved: 1,
      linksDropped: 2,
    });
  });

  it("a confirmed stub link replaces a proposed duplicate on the target, and a no-op transfer writes no log", async () => {
    const boss = await addUser(db, "Boss", "admin");
    const target = await addEntry(db, "Strong Target");
    const other = await addEntry(db, "Strong Other");
    const [stub] = await db
      .insert(schema.entry)
      .values({
        slug: "stub-strong",
        kind: "outside_partner",
        status: "draft",
        name: "Stub Strong",
        sourceLocale: "en",
      })
      .returning();
    const [a, b] =
      other.id < stub.id ? [other.id, stub.id] : [stub.id, other.id];
    await db
      .insert(schema.link)
      .values({
        fromId: a,
        toId: b,
        kind: "mentor",
        symmetric: false,
        status: "confirmed",
      })
      .returning();
    const [proposed] = await db
      .insert(schema.link)
      .values({
        fromId: other.id,
        toId: target.id,
        kind: "mentor",
        symmetric: false,
        status: "proposed",
      })
      .returning();
    expect(await mergePartner(stub.id, target.id, boss.id)).toEqual({
      ok: true,
    });
    const rows = await db
      .select()
      .from(schema.link)
      .where(eq(schema.link.kind, "mentor"));
    expect(rows.map((r) => r.status)).toEqual(["confirmed"]);
    expect(rows.some((r) => r.id === proposed.id)).toBe(false);

    const owner = await addUser(db, "Same Owner");
    const mine = await addEntry(db, "Mine", {}, { ownerUserId: owner.id });
    const before = (await changesOf(mine.id)).length;
    expect(await transferOwner(mine.id, owner.id, boss.id)).toEqual({
      ok: true,
    });
    expect((await changesOf(mine.id)).length).toBe(before);
  });

  it("moves a pin by hand, and refuses people", async () => {
    const boss = await addUser(db, "Boss", "admin");
    const org = await addEntry(db, "Pin Org");
    expect(await movePin(org.id, { lat: 45.8, lng: 16 }, boss.id)).toEqual({
      ok: true,
    });
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, org.id));
    expect(row).toMatchObject({
      lat: 45.8,
      lng: 16,
      pinMovedByHand: true,
      locationSource: "manual",
    });
    const [queued] = await db
      .insert(schema.reviewItem)
      .values({
        type: "untrusted_edit",
        entityType: "entry",
        entityId: org.id,
        payload: { patch: { lng: 2, city: "Old" } },
      })
      .returning();
    await movePin(org.id, { lat: 46, lng: 17 }, boss.id);
    const [after] = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.id, queued.id));
    expect(after.payload).toMatchObject({
      patch: { lat: 46, lng: 17, city: "Old", pinMovedByHand: true },
    });
    await db
      .update(schema.entry)
      .set({ kind: "person" })
      .where(eq(schema.entry.id, org.id));
    expect(await movePin(org.id, { lat: 1, lng: 1 }, boss.id)).toEqual({
      ok: false,
      error: "person",
    });
  });

  it("changes a slug, keeps the old one as a redirect, and reports taken and invalid slugs", async () => {
    const boss = await addUser(db, "Boss", "admin");
    const a = await addEntry(db, "Slug A");
    const b = await addEntry(db, "Slug B");
    expect(await changeSlug(a.id, "brand-new", boss.id)).toEqual({ ok: true });
    const history = await db
      .select()
      .from(schema.slugHistory)
      .where(eq(schema.slugHistory.entryId, a.id));
    expect(history.map((h) => h.slug)).toEqual([a.slug]);
    expect(await changeSlug(b.id, "brand-new", boss.id)).toEqual({
      ok: false,
      error: "taken",
    });
    expect(await changeSlug(b.id, "Not Valid!", boss.id)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await changeSlug(b.id, "admin", boss.id)).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("detail shows status history and open review items", async () => {
    const org = await addEntry(db, "Detail Org");
    const boss = await addUser(db, "Boss", "admin");
    await db.insert(schema.changeLog).values({
      entityType: "entry",
      entityId: org.id,
      userId: boss.id,
      source: "admin",
      action: "status_change",
      before: { status: "published" },
      after: { status: "suspended", suspendedReason: "spam" },
    });
    await db.insert(schema.reviewItem).values({
      type: "report",
      entityType: "entry",
      entityId: org.id,
    });
    const detail = await getAdminEntryDetail(org.id);
    expect(detail.history[0]).toMatchObject({
      from: "published",
      to: "suspended",
      reason: "spam",
      actor: "Boss",
    });
    expect(detail.reviews).toHaveLength(1);
    expect(detail.fields.find((f) => f.key === "contactEmail")).toBeDefined();
  });

  it("exports contact data, escapes formulas and leaves out listings queued for deletion", async () => {
    const shown = await addEntry(db, "=Formula Org");
    await db
      .update(schema.entry)
      .set({ contactEmail: "contact@example.test" })
      .where(eq(schema.entry.id, shown.id));
    const gone = await addEntry(db, "Erasing Org");
    await db
      .update(schema.entry)
      .set({ erasureRequestedAt: new Date() })
      .where(eq(schema.entry.id, gone.id));
    const csv = await exportEntries();
    expect(csv.split("\r\n")[0]).toContain("contact_email");
    expect(csv).toContain("contact@example.test");
    expect(csv).toContain("'=Formula Org");
    expect(csv).not.toContain("Erasing Org");
  });

  it("escapes multi-line formula text but keeps phone numbers, and fills owner_email", async () => {
    const owner = await addUser(db, "Export Owner");
    const row = await addEntry(db, "Phone Org", {}, { ownerUserId: owner.id });
    await db
      .update(schema.entry)
      .set({
        contactPhone: "+385 91 234 5678",
        descriptionText: '=HYPERLINK("http://x.test")\nmore text',
      })
      .where(eq(schema.entry.id, row.id));
    const csv = await exportEntries();
    const line = csv.split("\r\n").find((l) => l.includes(row.slug)) ?? "";
    expect(line).toContain(owner.email);
    expect(csv).toContain(",+385 91 234 5678,");
    expect(csv).toContain("'=HYPERLINK");
  });
});
