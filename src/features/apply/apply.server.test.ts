import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { emptyLocation } from "@/features/location";
import { parseRichText } from "@/lib/rich-text/parse-rich-text";
import { richTextFromPlain } from "@/lib/rich-text/empty-rich-text";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import { InvalidTownError } from "./apply-entry-fields";
import type { ApplicationInput } from "./apply-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("apply") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { createApplication, resubmitApplication } =
  await import("./apply.server");
const { verifyApplication } = await import("./verify-application.server");
const { findSimilarEntries } = await import("./similar-entries.server");
const { issueApplicationToken } = await import("./application-tokens.server");

function application(
  overrides: Partial<ApplicationInput> = {},
): ApplicationInput {
  return {
    kind: "organization",
    name: "Studio Harbour",
    description: parseRichText(
      richTextFromPlain("We run workshops for schools every week."),
    ),
    contactName: "",
    contactEmail: "Owner@Example.test",
    contactPhone: "",
    website: null,
    location: {
      ...emptyLocation("HR"),
      city: "Zagreb",
      lat: 45.8,
      lng: 16,
      source: "manual",
    },
    consent: false,
    ageConfirmed: false,
    ...overrides,
  };
}

describe.skipIf(!temp)("apply services", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function verifyLinkToken(email: string): Promise<string> {
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
    return (
      new URL(mail?.props.link ?? "http://x").searchParams.get("token") ?? ""
    );
  }

  it("keeps an application out of the queue until the address is confirmed", async () => {
    await createApplication(application(), "en");
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Studio Harbour"));
    expect(row.status).toBe("draft");
    expect(row.contactEmail).toBe("owner@example.test");
    expect(await db.select().from(schema.reviewItem)).toHaveLength(0);

    const token = await verifyLinkToken("owner@example.test");
    expect(await verifyApplication(token)).toMatchObject({
      status: "verified",
    });
    const items = await db.select().from(schema.reviewItem);
    expect(items).toMatchObject([{ type: "application", status: "open" }]);
    // A second click on the same link changes nothing.
    expect(await verifyApplication(token)).toMatchObject({ status: "already" });
    expect(await db.select().from(schema.reviewItem)).toHaveLength(1);
  });

  it("rejects an unknown token", async () => {
    expect(await verifyApplication("nope")).toEqual({ status: "invalid" });
  });

  const dubrovnik = {
    ...emptyLocation("HR"),
    city: "Dubrovnik",
    lat: 42.6413,
    lng: 18.1091,
    precision: "town" as const,
    source: "town_list" as const,
    display: "town" as const,
    townPopulation: 26922,
  };

  function person(location: ApplicationInput["location"], name = "Ana Person") {
    return application({
      kind: "person",
      name,
      consent: true,
      ageConfirmed: true,
      contactEmail: `${name.replaceAll(" ", "").toLowerCase()}@example.test`,
      location,
    });
  }

  it("stores people at an offset town pin with the consent version", async () => {
    await createApplication(person(dubrovnik), "hr");
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Ana Person"));
    expect(row.consentVersion).toBeTruthy();
    expect(row.consentAt).toBeInstanceOf(Date);
    expect(row.locationDisplay).toBe("town");
    expect(row.precision).toBe("town");
    // The pin is near the town centre but never on it.
    expect(row.lat).not.toBe(42.6413);
    expect(Math.abs((row.lat ?? 0) - 42.6413)).toBeLessThan(0.1);
  });

  it("ignores everything the browser says about a person's place except the town", async () => {
    await createApplication(
      person(
        {
          ...dubrovnik,
          addressText: "Stradun 1",
          display: "exact",
          precision: "house",
          pinMovedByHand: true,
        },
        "Forged Pin",
      ),
      "hr",
    );
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Forged Pin"));
    expect(row.addressText).toBeNull();
    expect(row.locationDisplay).toBe("town");
    expect(row.precision).toBe("town");
    expect(row.pinMovedByHand).toBe(false);
  });

  it("refuses a person whose coordinates are not a known town", async () => {
    await expect(
      createApplication(
        person({ ...dubrovnik, lat: 42.640123, lng: 18.110987 }, "Exact Home"),
        "hr",
      ),
    ).rejects.toBeInstanceOf(InvalidTownError);
    await expect(
      createApplication(
        person({ ...emptyLocation("HR"), city: "Dubrovnik" }, "No Pin"),
        "hr",
      ),
    ).rejects.toBeInstanceOf(InvalidTownError);
    expect(
      await db
        .select()
        .from(schema.entry)
        .where(eq(schema.entry.name, "Exact Home")),
    ).toHaveLength(0);
  });

  it("reserves the real slug only after the address is confirmed", async () => {
    await createApplication(
      application({ name: "Slug Later", contactEmail: "slug@example.test" }),
      "en",
    );
    const [draft] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Slug Later"));
    expect(draft.slug.startsWith("draft-")).toBe(true);
    await verifyApplication(await verifyLinkToken("slug@example.test"));
    const [pending] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, draft.id));
    expect(pending.slug).toBe("slug-later");
  });

  it("logs which fields a resubmission changed", async () => {
    await createApplication(
      application({ name: "Log Me", contactEmail: "logme@example.test" }),
      "en",
    );
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Log Me"));
    await db
      .update(schema.entry)
      .set({ status: "rejected" })
      .where(eq(schema.entry.id, row.id));
    const edit = await issueApplicationToken(db, "apply-edit", row.id, 3600);
    await resubmitApplication(
      application({
        name: "Log Me",
        contactEmail: "logme@example.test",
        website: "https://logme.example.test",
      }),
      edit,
    );
    const rows = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, row.id));
    const update = rows.find((r) => r.action === "update");
    expect(update?.changedFields).toEqual(["website"]);
    expect(update?.after).toEqual({ website: "https://logme.example.test" });
  });

  it("lets a rejected application be edited and queued again", async () => {
    await createApplication(
      application({ name: "Rejected Place", contactEmail: "r@example.test" }),
      "en",
    );
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Rejected Place"));
    await db
      .update(schema.entry)
      .set({ status: "rejected" })
      .where(eq(schema.entry.id, row.id));
    const token = await issueApplicationToken(db, "apply-edit", row.id, 3600);

    const result = await resubmitApplication(
      application({ name: "Rejected Place", contactEmail: "r@example.test" }),
      token,
    );
    expect(result).toEqual({ status: "received" });
    const [after] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, row.id));
    expect(after.status).toBe("pending");
    await expect(
      resubmitApplication(
        application({ contactEmail: "r@example.test" }),
        "bad",
      ),
    ).rejects.toThrow("Not found");
  });

  it("finds public listings by a similar name and never pending ones", async () => {
    await addEntry(db, "Harbour Collective");
    await addEntry(db, "Harbour Hidden", {}, { status: "pending" });
    const names = (await findSimilarEntries("harbour")).map((r) => r.name);
    expect(names).toEqual(["Harbour Collective"]);
  });

  it("invalidates earlier confirm links when a resubmission changes the address", async () => {
    await createApplication(
      application({ name: "Moved Mail", contactEmail: "old@example.test" }),
      "en",
    );
    const oldToken = await verifyLinkToken("old@example.test");
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Moved Mail"));
    await db
      .update(schema.entry)
      .set({ status: "rejected" })
      .where(eq(schema.entry.id, row.id));
    const edit = await issueApplicationToken(db, "apply-edit", row.id, 3600);

    const result = await resubmitApplication(
      application({ name: "Moved Mail", contactEmail: "new@example.test" }),
      edit,
    );
    expect(result).toEqual({ status: "verify" });
    expect(await verifyApplication(oldToken)).toEqual({ status: "invalid" });
    // The edit link is spent, and the new address can still confirm.
    await expect(
      resubmitApplication(
        application({ contactEmail: "new@example.test" }),
        edit,
      ),
    ).rejects.toThrow("Not found");
    const fresh = await verifyLinkToken("new@example.test");
    expect(await verifyApplication(fresh)).toMatchObject({
      status: "verified",
    });
  });

  it("rejects an application kind the site does not offer", async () => {
    const { applicationSchema } = await import("./apply-schemas");
    const parsed = applicationSchema.safeParse({
      ...application({ kind: "person", consent: true, ageConfirmed: true }),
      website: "",
      description: richTextFromPlain(
        "We run workshops for schools every week.",
      ),
    });
    expect(parsed.error?.issues.map((issue) => issue.path[0])).toContain(
      "kind",
    );
  });
});
