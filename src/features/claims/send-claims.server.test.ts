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
  env: {
    PSEUDONYM_SECRET: "test-secret",
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://localhost:3000",
  },
}));
const { prepareClaimInvites } = await import("./prepare-claims.server");
const { planClaimBatch, sendClaimBatch } = await import("./send-claims.server");
const { suppressEmail } = await import("./email-suppression.server");

describe.skipIf(!temp)("claim sending", () => {
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
  async function templates() {
    return (await db.select().from(schema.job)).map(
      (row) => (row.payload as { template: string }).template,
    );
  }

  async function reset() {
    await db.delete(schema.job);
    await db.delete(schema.claimInvite);
    await db.delete(schema.emailSuppression);
    await db.delete(schema.entry);
  }

  it("queues one claim email per invite up to the batch and restarts the 30 days", async () => {
    await reset();
    await imported("one");
    await imported("two");
    await prepareClaimInvites();
    // Prepared a month ago: the links must still be fresh after the send.
    await db
      .update(schema.claimInvite)
      .set({ expiresAt: new Date(Date.now() + 86_400_000) });

    expect(await planClaimBatch(5)).toMatchObject({ invites: 2, reminders: 0 });
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

  it("skips addresses that opted out or bounced after preparing without using batch slots", async () => {
    await reset();
    await imported("out-a");
    await imported("out-b");
    await imported("bounced");
    await imported("fine");
    await prepareClaimInvites();
    await suppressEmail(db, "out-a@example.com", "manual");
    await suppressEmail(db, "out-b@example.com", "claim_removal");
    await db
      .update(schema.entry)
      .set({ contactEmailInvalid: true })
      .where(eq(schema.entry.contactEmail, "bounced@example.com"));

    expect(await sendClaimBatch(1, "A test source")).toEqual({
      invites: 1,
      reminders: 0,
    });
    const [row] = await db.select().from(schema.job);
    expect(row.payload).toMatchObject({ to: "fine@example.com" });
  });

  it("mails an address that belongs to several listings only once", async () => {
    await reset();
    await imported("twin-a", { contactEmail: "shared@example.com" });
    await imported("twin-b", { contactEmail: "shared@example.com" });
    await prepareClaimInvites();
    expect(await sendClaimBatch(5, "A test source")).toMatchObject({
      invites: 1,
    });
    expect(await sendClaimBatch(5, "A test source")).toMatchObject({
      invites: 0,
    });
  });

  it("fills the batch past candidates that went stale, and ignores a changed contact address", async () => {
    await reset();
    await imported("stale-a");
    await imported("stale-b");
    await imported("good-c");
    await prepareClaimInvites();
    await db
      .update(schema.entry)
      .set({ contactEmail: "corrected@example.com" })
      .where(eq(schema.entry.contactEmail, "stale-a@example.com"));
    await db
      .update(schema.entry)
      .set({ erasureRequestedAt: new Date() })
      .where(eq(schema.entry.contactEmail, "stale-b@example.com"));
    expect(await sendClaimBatch(1, "A test source")).toMatchObject({
      invites: 1,
    });
    const [row] = await db.select().from(schema.job);
    expect(row.payload).toMatchObject({ to: "good-c@example.com" });
  });

  it("does not double mail an address when two runs overlap", async () => {
    await reset();
    await imported("dup-a", { contactEmail: "dup@example.com" });
    await imported("dup-b", { contactEmail: "dup@example.com" });
    await prepareClaimInvites();
    await Promise.all([
      sendClaimBatch(5, "A test source"),
      sendClaimBatch(5, "A test source"),
    ]);
    expect(await templates()).toEqual(["claim"]);
  });

  it("reports first mails whose job failed in the plan", async () => {
    await reset();
    await imported("failed-one");
    await prepareClaimInvites();
    await sendClaimBatch(5, "A test source");
    await db.update(schema.job).set({ status: "failed" });
    expect(await planClaimBatch(5)).toMatchObject({ failedFirstMails: 1 });
  });

  it("sends the single reminder after ten days, once the first mail was delivered, to open invites only", async () => {
    await reset();
    await imported("r-open");
    await imported("r-used");
    await imported("r-quiet");
    await prepareClaimInvites();
    await sendClaimBatch(5, "x");
    const longAgo = new Date(Date.now() - 11 * 86_400_000);
    await db.update(schema.claimInvite).set({ sentAt: longAgo });
    // Queued but not delivered yet: no reminder.
    expect(await sendClaimBatch(5, "x")).toMatchObject({ reminders: 0 });
    await db.update(schema.job).set({ status: "done" });

    await db
      .update(schema.claimInvite)
      .set({ usedAt: new Date() })
      .where(eq(schema.claimInvite.email, "r-used@example.com"));
    await suppressEmail(db, "r-quiet@example.com", "claim_removal");

    expect(await planClaimBatch(5)).toMatchObject({ invites: 0, reminders: 1 });
    expect(await sendClaimBatch(5, "x")).toEqual({ invites: 0, reminders: 1 });
    const reminders = (await templates()).filter((t) => t === "claim_reminder");
    expect(reminders).toHaveLength(1);
    expect(await sendClaimBatch(5, "x")).toEqual({ invites: 0, reminders: 0 });
  });
});
