import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addTag } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import type { StagingFile, StagingOrganization } from "./import-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("import") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { runImport, listImportedWithoutPrecisePin } =
  await import("./import-run.server");
const { planImport } = await import("./import-plan.server");

function org(
  legacyId: string,
  name: string,
  extra: Partial<StagingOrganization> = {},
): StagingOrganization {
  return {
    legacyId,
    name,
    description: "First paragraph.\nSecond paragraph.",
    website: `https://${legacyId}.example.com`,
    socials: {},
    contactName: "Fake Person",
    contactEmail: `${legacyId}@example.com`,
    contactPhone: "+000 000",
    location: {
      addressText: "Example Street 1",
      city: "Exampletown",
      countryCode: "HR",
      lat: null,
      lng: null,
      precision: null,
      source: null,
    },
    legalStatus: "Non-profit",
    references: "Worked with fake partners.",
    seekingText: "",
    topics: ["art"],
    ...extra,
  };
}

const file: StagingFile = {
  version: 1,
  site: "rpcc",
  source: "test",
  exportedAt: new Date().toISOString(),
  organizations: [
    org("1", "Alpha Studio"),
    org("2", "Beta Lab", {
      location: {
        addressText: "Example Street 2",
        city: "Exampletown",
        countryCode: "HR",
        lat: 45.1,
        lng: 15.2,
        precision: "house",
        source: "manual",
      },
    }),
  ],
};

describe.skipIf(!temp)("legacy import", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  it("imports published, ownerless listings with hidden contacts, tags and a log row", async () => {
    await addTag(db, "art");
    expect(await runImport(file)).toEqual({ created: 2, skipped: 0 });

    const rows = await db.select().from(schema.entry);
    const alpha = rows.find((row) => row.name === "Alpha Studio");
    expect(alpha).toMatchObject({
      status: "published",
      ownerUserId: null,
      slug: "alpha-studio",
      contactEmail: "1@example.com",
      visibility: { contactEmail: "hidden" },
      extra: { legacy_id: "1", legal_status: "Non-profit" },
    });
    expect(alpha?.importedAt).not.toBeNull();
    expect(alpha?.descriptionText).toBe("First paragraph.\nSecond paragraph.");

    const tags = await db.select().from(schema.entryTag);
    expect(tags.map((t) => t.field)).toEqual(["topic", "topic"]);
    const logs = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.source, "import"));
    expect(logs).toHaveLength(2);
    expect(JSON.stringify(logs)).not.toContain("example.com");
  });

  it("is idempotent and does not overwrite later edits", async () => {
    await db
      .update(schema.entry)
      .set({ name: "Alpha Studio Renamed" })
      .where(sql`${schema.entry.extra}->>'legacy_id' = '1'`);
    expect(await runImport(file)).toEqual({ created: 0, skipped: 2 });
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(sql`${schema.entry.extra}->>'legacy_id' = '1'`);
    expect(row.name).toBe("Alpha Studio Renamed");
  });

  it("lists imported listings without a precise pin", async () => {
    const list = await listImportedWithoutPrecisePin();
    expect(list.map((item) => item.slug)).toEqual(["alpha-studio"]);
  });

  it("plans a rerun with duplicates and warnings", async () => {
    const plan = await planImport({
      ...file,
      organizations: [
        ...file.organizations,
        org("3", "Beta Lab", { contactEmail: "" }),
      ],
    });
    expect(plan.alreadyImported).toEqual(["1", "2"]);
    expect(plan.toCreate).toEqual(["3"]);
    expect(plan.duplicates[0]).toMatchObject({ legacyId: "3" });
    expect(plan.warnings.map((w) => w.code)).toContain("no_email");
  });
});
