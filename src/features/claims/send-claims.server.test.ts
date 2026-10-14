import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("claim_send") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret", NODE_ENV: "test" },
}));
const { prepareClaimInvites } = await import("./prepare-claims.server");
const { sendClaimBatch } = await import("./send-claims.server");
const { suppressEmail } = await import("./email-suppression.server");

describe.skipIf(!temp)("claim sending", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function imported(name: string) {
    const listing = await addEntry(db, name);
    await db
      .update(schema.entry)
      .set({ importedAt: new Date(), contactEmail: `${name}@example.com` })
      .where(eq(schema.entry.id, listing.id));
    return listing;
  }
  async function templates() {
    return (await db.select().from(schema.job)).map(
      (row) => (row.payload as { template: string }).template,
    );
  }

  it("queues one claim email per invite up to the batch and restarts the 30 days", async () => {
    await imported("one");
    await imported("two");
    await imported("three");
    await suppressEmail(db, "three@example.com", "claim_removal");
    await prepareClaimInvites();
    // Prepared a month ago: the links must still be fresh after the send.
    await db
      .update(schema.claimInvite)
      .set({ expiresAt: new Date(Date.now() + 86_400_000) });

    expect(await sendClaimBatch(1, "A test source")).toEqual({
      invites: 1,
      reminders: 0,
    });
    expect(await templates()).toEqual(["claim"]);
    const sent = await db
      .select()
      .from(schema.claimInvite)
      .where(sql`${schema.claimInvite.sentAt} is not null`);
    expect(sent).toHaveLength(1);
    expect(sent[0].expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 29 * 86_400_000,
    );

    expect(await sendClaimBatch(5, "A test source")).toMatchObject({
      invites: 1,
    });
    expect(await sendClaimBatch(5, "A test source")).toEqual({
      invites: 0,
      reminders: 0,
    });
  });

  it("sends the single reminder after ten days, only to open invites", async () => {
    expect(await sendClaimBatch(5, "x")).toMatchObject({ reminders: 0 });
    await db
      .update(schema.claimInvite)
      .set({ sentAt: new Date(Date.now() - 11 * 86_400_000) });
    const [first] = await db.select().from(schema.claimInvite).limit(1);
    await db
      .update(schema.claimInvite)
      .set({ usedAt: new Date() })
      .where(eq(schema.claimInvite.id, first.id));

    expect(await sendClaimBatch(5, "x")).toEqual({ invites: 0, reminders: 1 });
    expect(
      (await templates()).filter((t) => t === "claim_reminder"),
    ).toHaveLength(1);
    expect(await sendClaimBatch(5, "x")).toEqual({ invites: 0, reminders: 0 });
  });
});
