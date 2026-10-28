import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("claim") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret", NODE_ENV: "test" },
}));
const { claimListing, getClaimPreview, hashClaimToken } =
  await import("./claim.server");

describe.skipIf(!temp)("claiming an imported listing", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function invited(token: string, name: string) {
    const email = `${token}@example.test`;
    const listing = await addEntry(db, name);
    await db
      .update(schema.entry)
      .set({ contactEmail: email })
      .where(eq(schema.entry.id, listing.id));
    await db.insert(schema.claimInvite).values({
      entryId: listing.id,
      email,
      tokenHash: hashClaimToken(token),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    return listing;
  }

  async function ownerOf(entryId: string) {
    const [row] = await db
      .select({ owner: schema.entry.ownerUserId })
      .from(schema.entry)
      .where(eq(schema.entry.id, entryId));
    return row.owner;
  }

  it("claims an open invite", async () => {
    const listing = await invited("tok-open", "Open Place");
    expect(await getClaimPreview("tok-open")).toMatchObject({
      entryName: "Open Place",
    });
    expect(await claimListing("tok-open")).toMatchObject({ status: "ok" });
    expect(await ownerOf(listing.id)).toBeTruthy();
  });

  it("refuses an invite whose listing was archived or whose address changed", async () => {
    const archived = await invited("tok-archived", "Archived Place");
    await db
      .update(schema.entry)
      .set({ status: "archived" })
      .where(eq(schema.entry.id, archived.id));
    const moved = await invited("tok-moved", "Moved Place");
    await db
      .update(schema.entry)
      .set({ contactEmail: "someone-else@example.test" })
      .where(eq(schema.entry.id, moved.id));
    const bounced = await invited("tok-bounced", "Bounced Place");
    await db
      .update(schema.entry)
      .set({ contactEmailInvalid: true })
      .where(eq(schema.entry.id, bounced.id));

    for (const token of ["tok-archived", "tok-moved", "tok-bounced"]) {
      expect(await getClaimPreview(token)).toBeNull();
      expect(await claimListing(token)).toEqual({ status: "invalid" });
    }
    expect(await ownerOf(archived.id)).toBeNull();
    expect(await ownerOf(moved.id)).toBeNull();
    expect(await ownerOf(bounced.id)).toBeNull();
  });

  it("refuses a second listing for an account that already owns one", async () => {
    const first = await invited("tok-twice", "First Place");
    expect(await claimListing("tok-twice")).toMatchObject({ status: "ok" });
    const second = await addEntry(db, "Second Place");
    await db
      .update(schema.entry)
      .set({ contactEmail: "tok-twice@example.test" })
      .where(eq(schema.entry.id, second.id));
    await db.insert(schema.claimInvite).values({
      entryId: second.id,
      email: "tok-twice@example.test",
      tokenHash: hashClaimToken("tok-twice-2"),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    expect(await claimListing("tok-twice-2")).toEqual({ status: "refused" });
    expect(await ownerOf(first.id)).toBeTruthy();
    expect(await ownerOf(second.id)).toBeNull();
  });

  it("refuses the claim for a blocked account", async () => {
    await db.insert(schema.user).values({
      name: "Blocked",
      email: "tok-blocked@example.test",
      locale: "en",
      banned: true,
    });
    const listing = await invited("tok-blocked", "Blocked Place");
    expect(await claimListing("tok-blocked")).toEqual({ status: "refused" });
    expect(await ownerOf(listing.id)).toBeNull();
  });
});
