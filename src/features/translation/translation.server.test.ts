import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/errors";
import type { RichTextDoc } from "@/typings/rich-text";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import { needsNoindex } from "./translation-indexing";
import { saveTranslationInputSchema } from "./translation-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("translation_view") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { loadEntryTranslation } = await import("./translation-view.server");
const { saveOwnerTranslation } = await import("./save-translation.server");

const OFFERING_EN = "We offer mentoring for young designers every month.";
const OFFERING_HR = "Nudimo mentorstvo za mlade dizajnere svaki mjesec.";

function doc(text: string): RichTextDoc {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe.skipIf(!temp)("entry translation view and owner edit", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function setup() {
    const owner = await addUser(db, `owner-${Math.random()}@example.org`);
    const row = await addEntry(
      db,
      "Studio Plava",
      {},
      { ownerUserId: owner.id },
    );
    await db
      .update(schema.entry)
      .set({
        description: doc("A small studio."),
        descriptionText: "A small studio.",
        offeringText: OFFERING_EN,
      })
      .where(eq(schema.entry.id, row.id));
    return { owner, entry: row };
  }

  it("returns nothing in the owner's own language", async () => {
    const { entry } = await setup();
    expect(await loadEntryTranslation(entry.id, "en", null)).toBeNull();
  });

  it("lists untranslated fields and flags the page noindex", async () => {
    const { entry } = await setup();
    const view = await loadEntryTranslation(entry.id, "hr", null);
    expect(view?.sourceFields).toEqual(["description", "offering"]);
    expect(view?.texts).toEqual({});
    expect(needsNoindex(view)).toBe(true);
    expect(needsNoindex(null)).toBe(false);
  });

  it("shows stored translations, hides rows that no longer parse, and flags only the owner", async () => {
    const { owner, entry } = await setup();
    await db.insert(schema.translation).values([
      {
        entityType: "entry",
        entityId: entry.id,
        field: "offering",
        locale: "hr",
        text: OFFERING_HR,
        origin: "machine",
        sourceHash: "h",
      },
      {
        entityType: "entry",
        entityId: entry.id,
        field: "description",
        locale: "hr",
        text: "{not json",
        origin: "machine",
        sourceHash: "h",
      },
    ]);
    const visitor = await loadEntryTranslation(entry.id, "hr", null);
    expect(visitor?.texts.offering?.text).toBe(OFFERING_HR);
    expect(visitor?.texts.description).toBeUndefined();
    expect(visitor?.canEdit).toBe(false);
    expect(
      (await loadEntryTranslation(entry.id, "hr", owner.id))?.canEdit,
    ).toBe(true);
  });

  it("does not expose translations of unpublished entries", async () => {
    const row = await addEntry(db, "Draft Studio", {}, { status: "draft" });
    expect(await loadEntryTranslation(row.id, "hr", null)).toBeNull();
  });

  it("stores the owner's edit as a human row that the machine job leaves alone", async () => {
    const { owner, entry } = await setup();
    const input = saveTranslationInputSchema.parse({
      entryId: entry.id,
      offering: "  Moj prijevod.  ",
      description: doc("Malen studio."),
    });
    await saveOwnerTranslation(owner.id, input);

    const rows = await db
      .select()
      .from(schema.translation)
      .where(eq(schema.translation.entityId, entry.id));
    expect(rows.map((r) => [r.field, r.origin, r.locale]).sort()).toEqual([
      ["description", "human", "hr"],
      ["offering", "human", "hr"],
    ]);
    expect(rows.find((r) => r.field === "offering")?.text).toBe(
      "Moj prijevod.",
    );
    expect(
      await db
        .select()
        .from(schema.changeLog)
        .where(eq(schema.changeLog.entityId, entry.id)),
    ).toHaveLength(1);
  });

  it("removes the human row on an empty value and queues a fresh machine translation", async () => {
    const { owner, entry } = await setup();
    await saveOwnerTranslation(
      owner.id,
      saveTranslationInputSchema.parse({ entryId: entry.id, offering: "Moj." }),
    );
    await saveOwnerTranslation(
      owner.id,
      saveTranslationInputSchema.parse({ entryId: entry.id, offering: "" }),
    );
    expect(
      await db
        .select()
        .from(schema.translation)
        .where(
          and(
            eq(schema.translation.entityId, entry.id),
            eq(schema.translation.field, "offering"),
          ),
        ),
    ).toHaveLength(0);
    const jobs = await db
      .select()
      .from(schema.job)
      .where(eq(schema.job.type, "translate"));
    expect(
      jobs.some(
        (j) => (j.payload as { entityId: string }).entityId === entry.id,
      ),
    ).toBe(true);
  });

  it("keeps the owner's version after the original changes and marks it outdated", async () => {
    const { owner, entry } = await setup();
    await saveOwnerTranslation(
      owner.id,
      saveTranslationInputSchema.parse({ entryId: entry.id, offering: "Moj." }),
    );
    const fresh = await loadEntryTranslation(entry.id, "hr", null);
    expect(fresh?.texts.offering).toMatchObject({ outdated: false });

    await db
      .update(schema.entry)
      .set({ offeringText: "We now offer studio space as well." })
      .where(eq(schema.entry.id, entry.id));
    const after = await loadEntryTranslation(entry.id, "hr", null);
    expect(after?.texts.offering).toMatchObject({
      text: "Moj.",
      origin: "human",
      outdated: true,
    });
  });

  it("ignores rows of fields whose original text is gone", async () => {
    const { entry } = await setup();
    await db.insert(schema.translation).values({
      entityType: "entry",
      entityId: entry.id,
      field: "seeking",
      locale: "hr",
      text: "Ostatak.",
      origin: "human",
      sourceHash: "h",
    });
    const view = await loadEntryTranslation(entry.id, "hr", null);
    expect(view?.texts.seeking).toBeUndefined();
  });

  it("records the previous text in the change log and skips unchanged saves", async () => {
    const { owner, entry } = await setup();
    function save(offering: string) {
      return saveOwnerTranslation(
        owner.id,
        saveTranslationInputSchema.parse({ entryId: entry.id, offering }),
      );
    }
    await save("Prvi.");
    await save("Drugi.");
    const again = await save("Drugi.");
    expect(again.enqueued).toBe(false);
    const log = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, entry.id));
    expect(log).toHaveLength(2);
    expect(log.map((l) => l.before)).toContainEqual({
      translation_offering: "Prvi.",
    });
  });

  it("reports a queued job only when a human version was removed", async () => {
    const { owner, entry } = await setup();
    function save(offering: string) {
      return saveOwnerTranslation(
        owner.id,
        saveTranslationInputSchema.parse({ entryId: entry.id, offering }),
      );
    }
    expect((await save("Moj prijevod.")).enqueued).toBe(false);
    expect((await save("")).enqueued).toBe(true);
    expect((await save("")).enqueued).toBe(false);
  });

  it("treats someone else's entry as missing", async () => {
    const { entry } = await setup();
    const stranger = await addUser(db, `stranger-${Math.random()}@example.org`);
    await expect(
      saveOwnerTranslation(
        stranger.id,
        saveTranslationInputSchema.parse({ entryId: entry.id, offering: "x" }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
