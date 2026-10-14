import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("changes") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { revertChange, getChangeDetail } =
  await import("./revert-change.server");
const { listChanges } = await import("./list-changes.server");
const { stripOldChangeLog, stripEntityChangeLog } =
  await import("./strip-change-log.server");

describe.skipIf(!temp)("change log services", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function setup() {
    const owner = await addUser(db, "Owner");
    const admin = await addUser(db, "Admin", "admin");
    const listing = await addEntry(
      db,
      "Revert Me",
      {},
      { ownerUserId: owner.id },
    );
    await db
      .update(schema.entry)
      .set({ name: "Vandalised", contactEmail: "new@example.test" })
      .where(eq(schema.entry.id, listing.id));
    const log = await writeChange(db, {
      entityType: "entry",
      entityId: listing.id,
      userId: owner.id,
      source: "owner",
      action: "update",
      before: { name: "Revert Me", contactEmail: "old@example.test" },
      after: { name: "Vandalised", contactEmail: "new@example.test" },
    });
    return { owner, admin, listing, log };
  }

  it("restores the entry fields, writes a revert row and mails the owner", async () => {
    const { admin, listing, log, owner } = await setup();
    const detail = await getChangeDetail(log.id);
    expect(detail.revertible).toBe(true);
    expect(detail.diffs.map((d) => d.field).sort()).toEqual([
      "contactEmail",
      "name",
    ]);

    expect(await revertChange(log.id, "Spam in the name", admin.id)).toEqual({
      status: "ok",
    });
    const [after] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(after.name).toBe("Revert Me");
    expect(after.contactEmail).toBe("old@example.test");

    const rows = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, listing.id));
    const revert = rows.find((r) => r.action === "revert");
    expect(revert?.userId).toBe(admin.id);
    expect(rows.find((r) => r.id === log.id)?.revertedByLogId).toBe(revert?.id);

    const mails = (await db.select().from(schema.job)).map(
      (j) => j.payload as { template: string; to: string },
    );
    expect(mails).toContainEqual(
      expect.objectContaining({ template: "edit_reverted", to: owner.email }),
    );
    // Reverting the same change twice is refused.
    expect(await revertChange(log.id, "again", admin.id)).toEqual({
      status: "not_revertible",
    });
  });

  it("does not revert status changes or touch fields outside the entry columns", async () => {
    const { admin, listing } = await setup();
    const status = await writeChange(db, {
      entityType: "entry",
      entityId: listing.id,
      userId: admin.id,
      source: "admin",
      action: "status_change",
      before: { status: "published" },
      after: { status: "suspended" },
    });
    expect(await revertChange(status.id, "x", admin.id)).toEqual({
      status: "not_revertible",
    });
    const forged = await writeChange(db, {
      entityType: "entry",
      entityId: listing.id,
      userId: admin.id,
      source: "owner",
      action: "update",
      before: { ownerUserId: null, status: "draft" },
      after: { ownerUserId: admin.id, status: "published" },
    });
    expect(await revertChange(forged.id, "x", admin.id)).toEqual({
      status: "not_revertible",
    });
  });

  it("strips personal values and the actor from old rows only", async () => {
    const { listing, log } = await setup();
    await db
      .update(schema.changeLog)
      .set({ createdAt: new Date(Date.now() - 100 * 86_400_000) })
      .where(eq(schema.changeLog.id, log.id));
    const recent = await writeChange(db, {
      entityType: "entry",
      entityId: listing.id,
      userId: null,
      source: "owner",
      action: "update",
      before: { contactEmail: "keep@example.test", name: "a" },
      after: { contactEmail: "keep2@example.test", name: "b" },
    });
    await stripOldChangeLog(db);
    const [old] = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.id, log.id));
    expect(old.userId).toBeNull();
    expect(old.before).toEqual({ name: "Revert Me" });
    const [fresh] = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.id, recent.id));
    expect(fresh.before).toMatchObject({ contactEmail: "keep@example.test" });

    // The stripped field can no longer be restored, the name still can.
    const detail = await getChangeDetail(log.id);
    expect(
      detail.diffs.find((d) => d.field === "contactEmail")?.restorable,
    ).toBe(false);
    expect(detail.diffs.find((d) => d.field === "name")?.restorable).toBe(true);

    await stripEntityChangeLog(db, listing.id);
    const [erased] = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.id, recent.id));
    expect(erased.before).toBeNull();
    expect(erased.changedFields).toEqual(["contactEmail", "name"]);
  });

  it("restores a field group whole or not at all", async () => {
    const { admin, listing } = await setup();
    await db
      .update(schema.entry)
      .set({ name: "New name", city: "New Town", lat: 1 })
      .where(eq(schema.entry.id, listing.id));
    const log = await writeChange(db, {
      entityType: "entry",
      entityId: listing.id,
      userId: null,
      source: "owner",
      action: "update",
      before: { city: "Old Town", name: "Old name" },
      after: { city: "New Town", lat: 1, name: "New name" },
    });
    const detail = await getChangeDetail(log.id);
    const byField = Object.fromEntries(
      detail.diffs.map((d) => [d.field, d.restorable]),
    );
    // lat has no stored old value, so the city (same group) is not restored either; the name is.
    expect(byField).toEqual({ city: false, lat: false, name: true });
    expect(await revertChange(log.id, "x", admin.id)).toEqual({ status: "ok" });
    const [after] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(after.name).toBe("Old name");
  });

  it("strips every stored value of a person's rows after 90 days", async () => {
    const { listing, log } = await setup();
    await db
      .update(schema.entry)
      .set({ kind: "person" })
      .where(eq(schema.entry.id, listing.id));
    await db
      .update(schema.changeLog)
      .set({ createdAt: new Date(Date.now() - 100 * 86_400_000) })
      .where(eq(schema.changeLog.id, log.id));
    await stripOldChangeLog(db);
    const [row] = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.id, log.id));
    expect(row.before).toBeNull();
    expect(row.after).toBeNull();
  });

  it("lists and filters changes", async () => {
    const { listing } = await setup();
    const page = await listChanges({
      entityId: listing.id,
      action: "update",
      page: 1,
    });
    expect(page.rows.length).toBeGreaterThan(0);
    expect(page.rows.every((r) => r.entityId === listing.id)).toBe(true);
  });

  it("leaves a field alone that was edited again since the change", async () => {
    const { admin, listing, log } = await setup();
    await db
      .update(schema.entry)
      .set({ name: "Edited Again" })
      .where(eq(schema.entry.id, listing.id));
    const detail = await getChangeDetail(log.id);
    expect(detail.diffs.find((d) => d.field === "name")?.restorable).toBe(
      false,
    );
    expect(await revertChange(log.id, "x", admin.id)).toEqual({ status: "ok" });
    const [after] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(after.name).toBe("Edited Again");
    expect(after.contactEmail).toBe("old@example.test");
  });

  it("does not revert on a listing that is queued for deletion", async () => {
    const { admin, listing, log } = await setup();
    await db
      .update(schema.entry)
      .set({ erasureRequestedAt: new Date() })
      .where(eq(schema.entry.id, listing.id));
    expect((await getChangeDetail(log.id)).revertible).toBe(false);
    expect(await revertChange(log.id, "x", admin.id)).toEqual({
      status: "not_revertible",
    });
  });

  it("treats a field missing from the after values as edited since", async () => {
    const { admin, listing } = await setup();
    const lopsided = await writeChange(db, {
      entityType: "entry",
      entityId: listing.id,
      userId: admin.id,
      source: "owner",
      action: "update",
      before: { name: "Older Name" },
      after: {},
    });
    expect(await revertChange(lopsided.id, "x", admin.id)).toEqual({
      status: "not_revertible",
    });
    const [kept] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(kept.name).toBe("Vandalised");
  });
});
