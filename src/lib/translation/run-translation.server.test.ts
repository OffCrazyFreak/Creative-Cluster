import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import type { RichTextDoc } from "@/typings/rich-text";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import { runTranslation } from "./run-translation.server";
import {
  TranslationOutputError,
  TranslationQuotaError,
  type ITranslateInput,
  type ITranslationAdapter,
} from "./translation-adapter";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("translation") };
});

const OFFERING_EN =
  "We offer mentoring for young designers and open studio days every month.";
const OFFERING_HR =
  "Nudimo mentorstvo za mlade dizajnere i dane otvorenog ateljea svaki mjesec.";
const DESC_EN =
  "We are a small studio that makes posters and prints for cultural events.";
const DESC_HR =
  "Mi smo malen studio koji izrađuje plakate i otiske za kulturna događanja.";

function doc(text: string): RichTextDoc {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

// Answers from a table of known sentences, so tests control exactly what the "model" says.
function fakeAdapter(
  answers: Record<string, string>,
  calls: ITranslateInput[] = [],
): ITranslationAdapter {
  return {
    name: "fake",
    translate(input) {
      calls.push(input);
      return Promise.resolve(
        input.blocks.map((block) => answers[block] ?? block),
      );
    },
  };
}

describe.skipIf(!temp)("runTranslation", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function entryWithText() {
    const row = await addEntry(db, "Studio Plava");
    await db
      .update(schema.entry)
      .set({
        description: doc(DESC_EN),
        descriptionText: DESC_EN,
        offeringText: OFFERING_EN,
      })
      .where(eq(schema.entry.id, row.id));
    return row.id;
  }

  async function rows(entityId: string) {
    return db
      .select()
      .from(schema.translation)
      .where(eq(schema.translation.entityId, entityId));
  }

  const answers = { [OFFERING_EN]: OFFERING_HR, [DESC_EN]: DESC_HR };

  it("stores validated machine rows in the other locale with the glossary sent", async () => {
    const id = await entryWithText();
    const calls: ITranslateInput[] = [];
    await runTranslation(db, fakeAdapter(answers, calls), {
      entityType: "entry",
      entityId: id,
    });

    const stored = await rows(id);
    expect(stored.map((r) => r.field).sort()).toEqual([
      "description",
      "offering",
    ]);
    expect(
      stored.every((r) => r.locale === "hr" && r.origin === "machine"),
    ).toBe(true);
    expect(stored.find((r) => r.field === "offering")?.text).toBe(OFFERING_HR);
    expect(
      JSON.parse(stored.find((r) => r.field === "description")?.text ?? ""),
    ).toEqual(doc(DESC_HR));
    expect(calls).toHaveLength(2);
    expect(calls[0].glossary).toContain("Studio Plava");
  });

  it("skips fields whose source hash is unchanged", async () => {
    const id = await entryWithText();
    const calls: ITranslateInput[] = [];
    const request = { entityType: "entry" as const, entityId: id };
    await runTranslation(db, fakeAdapter(answers, calls), request);
    await runTranslation(db, fakeAdapter(answers, calls), request);
    expect(calls).toHaveLength(2);
  });

  it("retranslates only the field whose source changed", async () => {
    const id = await entryWithText();
    const calls: ITranslateInput[] = [];
    const request = { entityType: "entry" as const, entityId: id };
    await runTranslation(db, fakeAdapter(answers, calls), request);
    const changed = `${OFFERING_EN} Join us.`;
    await db
      .update(schema.entry)
      .set({ offeringText: changed })
      .where(eq(schema.entry.id, id));
    await runTranslation(
      db,
      fakeAdapter({ [changed]: `${OFFERING_HR} Pridruži nam se.` }, calls),
      request,
    );
    expect(calls).toHaveLength(3);
    expect(calls[2].blocks).toEqual([changed]);
  });

  it("never overwrites a human row", async () => {
    const id = await entryWithText();
    await db.insert(schema.translation).values({
      entityType: "entry",
      entityId: id,
      field: "offering",
      locale: "hr",
      text: "Ručni prijevod vlasnika.",
      origin: "human",
      sourceHash: "old",
    });
    const calls: ITranslateInput[] = [];
    await runTranslation(db, fakeAdapter(answers, calls), {
      entityType: "entry",
      entityId: id,
    });
    const offering = (await rows(id)).find((r) => r.field === "offering");
    expect(offering).toMatchObject({
      origin: "human",
      text: "Ručni prijevod vlasnika.",
    });
    expect(calls[0].blocks).not.toContain(OFFERING_EN);
  });

  it("retries once and stores nothing when validation keeps failing", async () => {
    const id = await entryWithText();
    const calls: ITranslateInput[] = [];
    // Echoing the English back fails the language check both times.
    await runTranslation(db, fakeAdapter({}, calls), {
      entityType: "entry",
      entityId: id,
    });
    expect(calls).toHaveLength(4);
    expect(await rows(id)).toHaveLength(0);
  });

  it("recovers on the retry when the first answer is malformed", async () => {
    const id = await entryWithText();
    let attempt = 0;
    const adapter: ITranslationAdapter = {
      name: "flaky",
      translate(input) {
        attempt += 1;
        if (attempt === 1)
          return Promise.reject(new TranslationOutputError("bad json"));
        return Promise.resolve(
          input.blocks.map((b) => answers[b as keyof typeof answers]),
        );
      },
    };
    await runTranslation(db, adapter, { entityType: "entry", entityId: id });
    expect(await rows(id)).toHaveLength(2);
  });

  it("removes the translation of a field the owner emptied, even with nothing else to translate", async () => {
    const id = await entryWithText();
    const request = { entityType: "entry" as const, entityId: id };
    await runTranslation(db, fakeAdapter(answers), request);
    await db
      .update(schema.entry)
      .set({ offeringText: "" })
      .where(eq(schema.entry.id, id));
    await runTranslation(db, fakeAdapter(answers), request);
    expect((await rows(id)).map((r) => r.field)).toEqual(["description"]);
  });

  it("drops a stale machine row when the retranslation fails", async () => {
    const id = await entryWithText();
    const request = { entityType: "entry" as const, entityId: id };
    await runTranslation(db, fakeAdapter(answers), request);
    await db
      .update(schema.entry)
      .set({ offeringText: "Completely new offer for our members this year." })
      .where(eq(schema.entry.id, id));
    await runTranslation(db, fakeAdapter({}), request);
    const left = await rows(id);
    expect(left.map((r) => r.field)).toEqual(["description"]);
  });

  it("keeps no stale text while a changed field waits for the quota", async () => {
    const id = await entryWithText();
    const request = { entityType: "entry" as const, entityId: id };
    await runTranslation(db, fakeAdapter(answers), request);
    await db
      .update(schema.entry)
      .set({ offeringText: "Completely new offer for our members this year." })
      .where(eq(schema.entry.id, id));
    const limited: ITranslationAdapter = {
      name: "limited",
      translate: () => Promise.reject(new TranslationQuotaError("used up")),
    };
    await runTranslation(db, limited, request);
    expect((await rows(id)).map((r) => r.field)).toEqual(["description"]);
  });

  it("defers to 00:05 UTC the next day on a quota error", async () => {
    const id = await entryWithText();
    const adapter: ITranslationAdapter = {
      name: "limited",
      translate() {
        return Promise.reject(new TranslationQuotaError("used up"));
      },
    };
    const result = await runTranslation(
      db,
      adapter,
      { entityType: "entry", entityId: id },
      new Date("2026-10-14T15:30:00Z"),
    );
    expect(result).toEqual({ deferUntil: new Date("2026-10-15T00:05:00Z") });
    expect(await rows(id)).toHaveLength(0);
  });

  it("stores nothing with the stand-in adapter", async () => {
    const id = await entryWithText();
    const { standInAdapter } = await import("./standin-adapter");
    await runTranslation(db, standInAdapter, {
      entityType: "entry",
      entityId: id,
    });
    expect(await rows(id)).toHaveLength(0);
    expect(
      await db
        .select()
        .from(schema.translation)
        .where(and(eq(schema.translation.entityId, id))),
    ).toHaveLength(0);
  });
});
