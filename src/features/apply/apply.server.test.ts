import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { emptyLocation } from "@/features/location";
import { parseRichText } from "@/lib/rich-text/parse-rich-text";
import { richTextFromPlain } from "@/lib/rich-text/empty-rich-text";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
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

  it("stores people at town level with the consent version", async () => {
    await createApplication(
      application({
        kind: "person",
        name: "Ana Person",
        consent: true,
        ageConfirmed: true,
        contactEmail: "ana@example.test",
      }),
      "hr",
    );
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.name, "Ana Person"));
    expect(row.consentVersion).toBeTruthy();
    expect(row.consentAt).toBeInstanceOf(Date);
    // A pin that did not come from the town list is dropped, never stored exactly.
    expect(row.lat).toBeNull();
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
