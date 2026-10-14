import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("claim_prepare") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret", NODE_ENV: "test" },
}));
const { prepareClaimInvites, listUnsentInvites } =
  await import("./prepare-claims.server");
const { claimTokenFor } = await import("./claim-token.server");
const { claimEmailProps } = await import("./claim-email-props.server");
const { suppressEmail } = await import("./email-suppression.server");
const { hashClaimToken } = await import("@/features/auth/claim.server");

describe.skipIf(!temp)("claim invite preparation", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function imported(
    name: string,
    patch: Partial<typeof schema.entry.$inferInsert> = {},
  ) {
    const listing = await addEntry(db, name);
    await db
      .update(schema.entry)
      .set({
        importedAt: new Date(),
        contactEmail: `${name}@example.com`,
        ...patch,
      })
      .where(eq(schema.entry.id, listing.id));
    return listing;
  }

  it("invites only unclaimed imports with a usable address, and queues nothing", async () => {
    const good = await imported("good");
    await imported("none", { contactEmail: null });
    await imported("broken", { contactEmail: "not an email" });
    await imported("bounced", { contactEmailInvalid: true });
    await imported("quiet");
    await suppressEmail(db, "quiet@example.com", "claim_removal");
    const owner = await addUser(db, "Owner");
    await imported("claimed", { ownerUserId: owner.id });
    const handmade = await addEntry(db, "handmade");
    await db
      .update(schema.entry)
      .set({ contactEmail: "handmade@example.com" })
      .where(eq(schema.entry.id, handmade.id));

    expect(await prepareClaimInvites()).toEqual({
      created: 1,
      invalidEmail: 1,
      suppressed: 1,
    });
    const invites = await db.select().from(schema.claimInvite);
    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({ entryId: good.id, sentAt: null });
    expect(await db.select().from(schema.job)).toHaveLength(0);
  });

  it("is idempotent and the stored hash matches the rebuilt token", async () => {
    expect(await prepareClaimInvites()).toMatchObject({ created: 0 });
    const [invite] = await db.select().from(schema.claimInvite);
    expect(invite.tokenHash).toBe(hashClaimToken(claimTokenFor(invite.id)));
    expect(invite.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 29 * 86_400_000,
    );
    const [unsent] = await listUnsentInvites();
    const props = claimEmailProps(unsent, "A test source");
    expect(props.link).toContain(`/claim/${claimTokenFor(invite.id)}`);
    expect(props.removeLink).toBe(`${props.link}/remove`);
  });
});
