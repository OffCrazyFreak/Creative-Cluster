import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("claim_removal") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret", NODE_ENV: "test" },
}));
const { getRemovalPreview, removeListingByToken } =
  await import("./claim-removal.server");
const { hashClaimToken } = await import("@/features/auth/claim.server");
const { isSuppressed } = await import("./email-suppression.server");

describe.skipIf(!temp)("claim removal link", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function invited(token: string, name: string) {
    const listing = await addEntry(db, name);
    await db.insert(schema.claimInvite).values({
      entryId: listing.id,
      email: `${token}@Example.com`,
      tokenHash: hashClaimToken(token),
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    return listing;
  }

  it("a visit changes nothing; the confirmed removal archives and suppresses", async () => {
    const listing = await invited("tok-one", "Remove Me");
    expect(await getRemovalPreview("tok-one")).toEqual({
      entryName: "Remove Me",
    });
    const [still] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(still.status).toBe("published");

    expect(await removeListingByToken("tok-one")).toEqual({ status: "ok" });
    const [gone] = await db
      .select()
      .from(schema.entry)
      .where(eq(schema.entry.id, listing.id));
    expect(gone.status).toBe("archived");
    expect(await isSuppressed(db, "TOK-ONE@example.com")).toBe(true);
    expect(await removeListingByToken("tok-one")).toEqual({
      status: "invalid",
    });
  });

  it("refuses unknown and expired tokens", async () => {
    expect(await removeListingByToken("nope")).toEqual({ status: "invalid" });
    const listing = await invited("tok-old", "Old Link");
    await db
      .update(schema.claimInvite)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.claimInvite.entryId, listing.id));
    expect(await removeListingByToken("tok-old")).toEqual({
      status: "invalid",
    });
  });
});
