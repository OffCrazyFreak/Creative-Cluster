import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { emptyLocation } from "@/features/location/location-schemas";
import { richTextFromPlain } from "@/lib/rich-text/empty-rich-text";
import { NotFoundError } from "@/server/errors";
import { InvalidListingError } from "./listing-errors";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import {
  listingSchema,
  validateListing,
  type ListingFormValues,
} from "./listing-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("account") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { saveOwnListing } = await import("./save-own-listing.server");
const { findOwnListing } = await import("./get-own-listing.server");

function formValues(
  overrides: Partial<ListingFormValues> = {},
): ListingFormValues {
  return {
    name: "Studio Test",
    sourceLocale: "en",
    description: richTextFromPlain("A studio."),
    offeringText: "",
    seekingText: "",
    website: "example.org",
    socials: {
      instagram: "",
      facebook: "",
      linkedin: "",
      x: "",
      youtube: "",
      tiktok: "",
    },
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    visibility: {
      website: "public",
      socials: "public",
      contactName: "members",
      contactEmail: "members",
      contactPhone: "hidden",
      address: "public",
    },
    location: {
      ...emptyLocation("HR"),
      city: "Split",
      lat: 43.5,
      lng: 16.4,
      precision: "house",
      source: "manual",
    },
    logo: null,
    cover: null,
    tags: { topic: [], offering: [], seeking: [] },
    legalStatus: "Cooperative",
    references: richTextFromPlain(""),
    matchingOptOut: false,
    ...overrides,
  };
}

function parse(values: ListingFormValues) {
  return listingSchema.parse(values);
}

describe.skipIf(!temp)("saveOwnListing", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function setup(trusted = true) {
    const owner = await addUser(db, "owner");
    const row = await addEntry(db, "Studio", {}, { ownerUserId: owner.id });
    if (!trusted) {
      await db
        .update(schema.entry)
        .set({ trusted: false })
        .where(eq(schema.entry.id, row.id));
    }
    return { owner, row };
  }
  async function reload(id: string) {
    const [row] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, id));
    return row;
  }

  it("applies an edit at once, keeps the slug and logs it", async () => {
    const { owner, row } = await setup();
    const result = await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(formValues()),
    });
    expect(result).toEqual({ status: "saved", changed: true });
    const saved = await reload(row.id);
    expect(saved.slug).toBe(row.slug);
    expect(saved.name).toBe("Studio Test");
    expect(saved.website).toBe("https://example.org");
    expect(saved.extra.legal_status).toBe("Cooperative");
    const logs = await db.select().from(schema.changeLog);
    expect(logs.filter((l) => l.entityId === row.id)).toHaveLength(1);
    const jobs = await db.select().from(schema.job);
    expect(jobs.filter((j) => j.type === "translate")).toHaveLength(1);
  });

  it("does nothing and queues no translation when nothing changed", async () => {
    const { owner, row } = await setup();
    const values = parse(formValues());
    await saveOwnListing({ entryId: row.id, userId: owner.id, values });
    const before = await db.select().from(schema.job);
    const again = await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values,
    });
    expect(again).toEqual({ status: "saved", changed: false });
    expect(await db.select().from(schema.job)).toHaveLength(before.length);
  });

  it("does not translate when only a link changes", async () => {
    const { owner, row } = await setup();
    await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(formValues()),
    });
    const before = await db.select().from(schema.job);
    await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(formValues({ website: "https://other.example" })),
    });
    expect(await db.select().from(schema.job)).toHaveLength(before.length);
  });

  it("treats another user's entry as missing", async () => {
    const { row } = await setup();
    const stranger = await addUser(db, "stranger");
    await expect(
      saveOwnListing({
        entryId: row.id,
        userId: stranger.id,
        values: parse(formValues()),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses edits once erasure is requested", async () => {
    const { owner, row } = await setup();
    await db
      .update(schema.entry)
      .set({ erasureRequestedAt: new Date() })
      .where(eq(schema.entry.id, row.id));
    await expect(
      saveOwnListing({
        entryId: row.id,
        userId: owner.id,
        values: parse(formValues()),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("sends an untrusted entry's edit to review and leaves it unchanged", async () => {
    const { owner, row } = await setup(false);
    const result = await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(formValues()),
    });
    expect(result).toEqual({ status: "pending_review" });
    expect((await reload(row.id)).name).toBe("Studio");
    const items = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, row.id));
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("untrusted_edit");
    const listing = await findOwnListing(owner.id);
    expect(listing?.hasPendingEdit).toBe(true);

    await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(formValues({ name: "Studio Again" })),
    });
    const open = (
      await db
        .select()
        .from(schema.reviewItem)
        .where(eq(schema.reviewItem.entityId, row.id))
    ).filter((item) => item.status === "open");
    expect(open).toHaveLength(1);
  });

  it("drops the pin of a person when a forged location carries no town population", async () => {
    const owner = await addUser(db, "forger");
    const row = await addEntry(db, "Bo", {}, { ownerUserId: owner.id });
    await db
      .update(schema.entry)
      .set({ kind: "person" })
      .where(eq(schema.entry.id, row.id));
    await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(
        formValues({
          location: {
            ...emptyLocation("HR"),
            city: "Split",
            lat: 43.508133,
            lng: 16.440193,
            precision: "house",
            source: "town_list",
            display: "exact",
          },
        }),
      ),
    });
    const saved = await reload(row.id);
    expect(saved.lat).toBeNull();
    expect(saved.locationDisplay).toBe("town");
  });

  it("clears the invalid-email flag when the contact email changes", async () => {
    const { owner, row } = await setup();
    await db
      .update(schema.entry)
      .set({ contactEmail: "old@example.test", contactEmailInvalid: true })
      .where(eq(schema.entry.id, row.id));
    await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(formValues({ contactEmail: "new@example.test" })),
    });
    expect((await reload(row.id)).contactEmailInvalid).toBe(false);
  });

  it("rejects an image id that was never uploaded", async () => {
    const { owner, row } = await setup();
    await expect(
      saveOwnListing({
        entryId: row.id,
        userId: owner.id,
        values: parse(
          formValues({
            logo: {
              id: "01a137e4-78a7-7279-8ffe-6d70d7f585fd",
              hash: "a".repeat(64),
              width: 256,
              height: 256,
              altText: "x",
            },
          }),
        ),
      }),
    ).rejects.toBeInstanceOf(InvalidListingError);
  });

  it("sends a tag-only edit of an untrusted entry to review", async () => {
    const { owner, row } = await setup(false);
    const [tag] = await db
      .insert(schema.tag)
      .values({ slug: "t-only", labelEn: "t", labelHr: "t" })
      .returning();
    await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(formValues()),
    });
    const same = await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(
        formValues({ tags: { topic: [tag.id], offering: [], seeking: [] } }),
      ),
    });
    expect(same).toEqual({ status: "pending_review" });
  });

  it("stores a person at an offset town pin with no address or cover", async () => {
    const owner = await addUser(db, "person");
    const row = await addEntry(db, "Ana", {}, { ownerUserId: owner.id });
    await db
      .update(schema.entry)
      .set({ kind: "person" })
      .where(eq(schema.entry.id, row.id));
    await saveOwnListing({
      entryId: row.id,
      userId: owner.id,
      values: parse(
        formValues({
          legalStatus: "Cooperative",
          location: {
            ...emptyLocation("HR"),
            city: "Dubrovnik",
            lat: 42.65,
            lng: 18.09,
            precision: "town",
            source: "town_list",
            display: "town",
            addressText: "Secret street 1",
            townPopulation: 40000,
          },
        }),
      ),
    });
    const saved = await reload(row.id);
    expect(saved.addressText).toBeNull();
    expect(saved.locationDisplay).toBe("town");
    expect(saved.lat).not.toBe(42.65);
    expect(Math.abs((saved.lat ?? 0) - 42.65)).toBeLessThan(0.1);
    expect(saved.extra.legal_status).toBeUndefined();
    expect(saved.coverImageId).toBeNull();
  });
});

describe("listingSchema", () => {
  it("rejects a non-http website and a missing city", () => {
    const result = listingSchema.safeParse(
      formValues({
        website: "javascript:alert(1)",
        location: emptyLocation("HR"),
      }),
    );
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join(".")) ?? [];
    expect(paths).toContain("website");
    expect(paths).toContain("location");
  });

  it("accepts an online-only listing without a city", () => {
    const result = listingSchema.safeParse(
      formValues({ location: { ...emptyLocation("HR"), onlineOnly: true } }),
    );
    expect(result.success).toBe(true);
  });
});

describe("validateListing", () => {
  it("puts nested location and image issues on the mounted field with localized text", () => {
    const result = validateListing({
      value: formValues({
        location: { ...emptyLocation("HR"), city: "x".repeat(200), lat: 1 },
      }),
    });
    expect(Object.keys(result?.fields ?? {})).toEqual(["location"]);
    expect(result?.fields.location.length).toBeGreaterThan(1);
    expect(
      result?.fields.location.some((issue) =>
        /too small|expected/i.test(issue.message),
      ),
    ).toBe(false);
  });
});
