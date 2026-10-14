import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("admin_entries") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { listAdminEntries } = await import("./list-entries.server");

const none = { page: 1 } as const;

describe.skipIf(!temp)("admin entry list", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function patch(
    id: string,
    set: Partial<typeof schema.entry.$inferInsert>,
  ) {
    await db.update(schema.entry).set(set).where(eq(schema.entry.id, id));
  }

  it("filters by flags, status and text, and counts the full match", async () => {
    const owner = await addUser(db, "Owner");
    const old = new Date(Date.now() - 400 * 24 * 3600 * 1000);
    const stale = await addEntry(
      db,
      "Stale Lab",
      {},
      { ownerUserId: owner.id },
    );
    await patch(stale.id, { lastConfirmedAt: old, countryCode: "HR" });
    const fresh = await addEntry(db, "Fresh Lab");
    await patch(fresh.id, { lastConfirmedAt: new Date(), trusted: false });
    const imported = await addEntry(
      db,
      "Imported Lab",
      {},
      { status: "archived" },
    );
    await patch(imported.id, {
      importedAt: new Date(),
      contactEmailInvalid: true,
    });
    const percent = await addEntry(db, "100% Real");

    async function ids(input: Parameters<typeof listAdminEntries>[0]) {
      return (await listAdminEntries(input)).rows.map((row) => row.id).sort();
    }

    expect(await ids({ ...none, stale: true })).toContain(stale.id);
    expect(await ids({ ...none, stale: true })).not.toContain(fresh.id);
    expect(await ids({ ...none, trusted: "no" })).toEqual([fresh.id]);
    expect(await ids({ ...none, unclaimed: true })).toEqual([imported.id]);
    expect(await ids({ ...none, emailInvalid: true })).toEqual([imported.id]);
    expect(await ids({ ...none, status: "archived" })).toEqual([imported.id]);
    expect(await ids({ ...none, country: "HR" })).toEqual([stale.id]);
    // A literal percent sign must not act as a wildcard.
    expect(await ids({ ...none, q: "100%" })).toEqual([percent.id]);
    expect(await ids({ ...none, q: owner.email.slice(0, 6) })).toEqual([
      stale.id,
    ]);
    const page = await listAdminEntries(none);
    expect(page.total).toBe(4);
  });
});
