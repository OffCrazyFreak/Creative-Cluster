import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it, vi } from "vitest";

import { MAX_SAVED_ENTRIES } from "@/constants/saved";
import * as schema from "@/db/schema";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import { replaceSavedInput } from "./saved-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("saved") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { listSavedEntries, replaceSavedList } =
  await import("./saved-entries.server");

describe("saved entries input", () => {
  it("rejects duplicates, also when only the case differs", () => {
    expect(replaceSavedInput.safeParse({ keys: ["a", "b"] }).success).toBe(
      true,
    );
    expect(replaceSavedInput.safeParse({ keys: ["a", "A"] }).success).toBe(
      false,
    );
  });

  it("rejects more than the limit", () => {
    const keys = Array.from(
      { length: MAX_SAVED_ENTRIES + 1 },
      (_, i) => `e${i}`,
    );
    expect(replaceSavedInput.safeParse({ keys }).success).toBe(false);
    expect(replaceSavedInput.safeParse({ keys: keys.slice(1) }).success).toBe(
      true,
    );
  });
});

describe.skipIf(!temp)("saved entries service", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  function slugs(rows: { slug: string }[]) {
    return rows.map((row) => row.slug);
  }

  it("replaces the whole list in the order given, by id or slug", async () => {
    const member = await addUser(db, "Replacer");
    const [a, b, c] = await Promise.all(
      ["Alpha", "Beta", "Gamma"].map((name) => addEntry(db, name)),
    );
    await replaceSavedList(member.id, [a.slug, b.id]);
    const saved = await replaceSavedList(member.id, [
      c.slug.toUpperCase(),
      a.id,
    ]);
    expect(slugs(saved)).toEqual([c.slug, a.slug]);
    expect(slugs(await listSavedEntries(member.id))).toEqual([c.slug, a.slug]);
  });

  it("saves an entry named by both its id and slug once", async () => {
    const member = await addUser(db, "Twice");
    const item = await addEntry(db, "Twice Named");
    const saved = await replaceSavedList(member.id, [item.id, item.slug]);
    expect(slugs(saved)).toEqual([item.slug]);
  });

  it("drops unknown and hidden entries", async () => {
    const member = await addUser(db, "Dropper");
    const open = await addEntry(db, "Open One");
    const hidden = await addEntry(
      db,
      "Hidden One",
      {},
      { status: "suspended" },
    );
    const saved = await replaceSavedList(member.id, [
      "no-such-entry",
      uuidv7(),
      hidden.slug,
      open.slug,
    ]);
    expect(slugs(saved)).toEqual([open.slug]);
  });

  it("does not let an entry hidden after saving take a slot", async () => {
    const member = await addUser(db, "Full List");
    const items = await Promise.all(
      Array.from({ length: MAX_SAVED_ENTRIES }, (_, i) =>
        addEntry(db, `Full ${i}`),
      ),
    );
    await replaceSavedList(
      member.id,
      items.map((item) => item.slug),
    );
    await db
      .update(schema.entry)
      .set({ status: "archived" })
      .where(eq(schema.entry.id, items[0].id));
    const visible = await listSavedEntries(member.id);
    expect(visible).toHaveLength(MAX_SAVED_ENTRIES - 1);

    const extra = await addEntry(db, "Full Extra");
    const saved = await replaceSavedList(member.id, [
      ...slugs(visible),
      extra.slug,
    ]);
    expect(saved).toHaveLength(MAX_SAVED_ENTRIES);
    const rows = await db
      .select()
      .from(schema.savedEntry)
      .where(eq(schema.savedEntry.userId, member.id));
    expect(rows).toHaveLength(MAX_SAVED_ENTRIES);
    expect(rows.some((row) => row.entryId === items[0].id)).toBe(false);
  });

  it("leaves another member's list alone", async () => {
    const [mine, theirs] = await Promise.all([
      addUser(db, "Mine"),
      addUser(db, "Theirs"),
    ]);
    const [x, y] = await Promise.all([addEntry(db, "X"), addEntry(db, "Y")]);
    await replaceSavedList(theirs.id, [x.slug, y.slug]);
    await replaceSavedList(mine.id, [y.slug]);
    await replaceSavedList(mine.id, []);
    expect(slugs(await listSavedEntries(theirs.id))).toEqual([x.slug, y.slug]);
    expect(await listSavedEntries(mine.id)).toEqual([]);
  });

  it("refuses a missing account", async () => {
    await expect(replaceSavedList(uuidv7(), [])).rejects.toThrow("Not found");
  });
});
