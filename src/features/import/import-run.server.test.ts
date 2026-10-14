import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addTag } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import { PINNED, org, stagingFile } from "./import-fixtures";
import { stagingFileSchema } from "./import-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("import") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { runImport, listImportedWithoutPrecisePin } =
  await import("./import-run.server");
const { planImport } = await import("./import-plan.server");

const file = stagingFile([
  org("1", "Alpha Studio"),
  org("2", "Beta Lab", { location: PINNED }),
]);

describe.skipIf(!temp)("legacy import", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });
  beforeEach(async () => {
    await db.delete(schema.job);
    await db.delete(schema.entry);
    await db.delete(schema.tag);
    await addTag(db, "art");
  });

  it("imports published, ownerless listings with hidden contacts, tags, a log row and a translation job", async () => {
    expect(await runImport(file)).toEqual({ created: 2, skipped: 0 });
    const [alpha] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Alpha Studio"));
    expect(alpha).toMatchObject({
      status: "published",
      ownerUserId: null,
      slug: "alpha-studio",
      visibility: { contactEmail: "hidden" },
      extra: { legacy_id: "1", legal_status: "Non-profit" },
    });
    expect(alpha.importedAt).not.toBeNull();
    expect(alpha.descriptionText).toBe("First paragraph.\nSecond paragraph.");
    expect(await db.select().from(schema.entryTag)).toHaveLength(2);
    const logs = await db.select().from(schema.changeLog);
    expect(logs.map((l) => l.source)).toEqual(["import", "import"]);
    expect(JSON.stringify(logs)).not.toContain("example.com");
    expect((await db.select().from(schema.job)).map((j) => j.type)).toEqual([
      "translate",
      "translate",
    ]);
  });

  it("is idempotent and does not overwrite later edits", async () => {
    await runImport(file);
    await db
      .update(schema.entry)
      .set({ name: "Alpha Renamed" })
      .where(sql`${schema.entry.extra}->>'legacy_id' = '1'`);
    expect(await runImport(file)).toEqual({ created: 0, skipped: 2 });
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(sql`${schema.entry.extra}->>'legacy_id' = '1'`);
    expect(row.name).toBe("Alpha Renamed");
  });

  it("refuses a file for the other site or with unseeded tags, writing nothing", async () => {
    await expect(
      runImport(stagingFile([org("1", "A")], "dnz")),
    ).rejects.toThrow("dnz");
    await expect(
      runImport(stagingFile([org("1", "A", { topics: ["crafts"] })])),
    ).rejects.toThrow("crafts");
    expect(await db.select().from(schema.entry)).toHaveLength(0);
  });

  it("lists published imports without a precise pin", async () => {
    await runImport(file);
    await runImport(stagingFile([org("3", "Gamma Hall")]));
    await db
      .update(schema.entry)
      .set({ status: "archived" })
      .where(eq(schema.entry.name, "Gamma Hall"));
    const list = await listImportedWithoutPrecisePin();
    expect(list.map((item) => item.slug)).toEqual(["alpha-studio"]);
  });

  it("plans a rerun with duplicates and warnings, and handles an empty file", async () => {
    await runImport(file);
    const plan = await planImport(
      stagingFile([
        ...file.organizations,
        org("3", "Beta Lab", { contactEmail: "" }),
      ]),
    );
    expect(plan.alreadyImported).toEqual(["1", "2"]);
    expect(plan.toCreate).toEqual(["3"]);
    expect(plan.duplicates[0]).toMatchObject({ legacyId: "3" });
    expect(plan.warnings.map((w) => w.code)).toContain("no_email");
    expect((await planImport(stagingFile([]))).total).toBe(0);
  });

  it("rejects a half pin and a pin without precision in the staging schema", () => {
    function valid(location: object) {
      return stagingFileSchema.safeParse(
        stagingFile([org("1", "Aa", { location: { ...PINNED, ...location } })]),
      ).success;
    }
    expect(valid({})).toBe(true);
    expect(valid({ lng: null })).toBe(false);
    expect(valid({ precision: null })).toBe(false);
  });
});
