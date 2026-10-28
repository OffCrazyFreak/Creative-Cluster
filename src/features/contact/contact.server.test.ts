import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry } from "../../../tests/helpers/fixture-data";
import type { ContactInput } from "./contact-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("contact") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret", NODE_ENV: "test" },
}));
vi.mock("@/server/request.server", () => ({
  clientIp: () => "203.0.113.9",
  UNKNOWN_IP: "unknown",
}));
vi.mock("@/lib/jobs/trigger-drain.server", () => ({
  triggerDrain: () => Promise.resolve(),
}));
const turnstile = vi.hoisted(() => ({ ok: true }));
vi.mock("@/lib/turnstile/verify-turnstile.server", () => {
  class TurnstileError extends Error {}
  return {
    TurnstileError,
    verifyTurnstile: () =>
      turnstile.ok ? Promise.resolve() : Promise.reject(new TurnstileError()),
  };
});

const { sendContactMessage } = await import("./contact.server");
const { purgeContactData } = await import("./purge-contact.server");
const { scrubContactJob } = await import("./scrub-contact-job.server");
const { suppressEmail } =
  await import("@/features/claims/email-suppression.server");

const db = temp!.db;

async function recipient(contactEmail: string | null = "owner@example.org") {
  const row = await addEntry(db, "Studio");
  await db
    .update(schema.entry)
    .set({ contactEmail })
    .where(eq(schema.entry.id, row.id));
  return row;
}

function input(entryId: string, extra: Partial<ContactInput> = {}) {
  return {
    entryId,
    locale: "en",
    name: "Visitor",
    email: "Visitor@Example.org",
    message: "Hello there",
    turnstileToken: "token",
    fax: "",
    filledMs: 10_000,
    ...extra,
  } satisfies ContactInput;
}

beforeEach(async () => {
  turnstile.ok = true;
  await db.delete(schema.job);
  await db.delete(schema.contactMessage);
  await db.delete(schema.usageCounter);
});
afterAll(() => temp?.drop());

describe("sendContactMessage", () => {
  it("queues one mail to the owner with Reply-To the visitor and stores only a hash", async () => {
    const row = await recipient();
    const result = await sendContactMessage(input(row.id));
    expect(result).toEqual({ status: "sent", kind: "organization" });
    const [queued] = await db.select().from(schema.job);
    expect(queued?.payload).toMatchObject({
      template: "contact",
      to: "owner@example.org",
      replyTo: "Visitor@Example.org",
    });
    const [stored] = await db.select().from(schema.contactMessage);
    expect(stored?.senderHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.senderHash).not.toContain("example");
  });

  it("limits a sender to 3 per hour, whatever the letter case", async () => {
    const row = await recipient();
    for (const email of ["a@b.org", "A@B.org", "a@b.org"]) {
      expect((await sendContactMessage(input(row.id, { email }))).status).toBe(
        "sent",
      );
    }
    const fourth = await sendContactMessage(
      input(row.id, { email: "A@b.ORG" }),
    );
    expect(fourth).toEqual({ status: "limited" });
    expect(await db.select().from(schema.job)).toHaveLength(3);
  });

  it("limits an entry to 5 per day", async () => {
    const row = await recipient();
    for (let i = 0; i < 5; i += 1) {
      await sendContactMessage(input(row.id, { email: `v${i}@example.org` }));
    }
    const sixth = await sendContactMessage(
      input(row.id, { email: "v9@example.org" }),
    );
    expect(sixth).toEqual({ status: "limited" });
  });

  it("drops honeypot and too-fast submissions without queuing", async () => {
    const row = await recipient();
    const trap = await sendContactMessage(input(row.id, { fax: "x" }));
    const fast = await sendContactMessage(input(row.id, { filledMs: 500 }));
    expect(trap).toEqual({ status: "sent", kind: null });
    expect(fast).toEqual({ status: "sent", kind: null });
    expect(await db.select().from(schema.job)).toHaveLength(0);
  });

  it("reports a failed Turnstile check and sends nothing", async () => {
    const row = await recipient();
    turnstile.ok = false;
    expect(await sendContactMessage(input(row.id))).toEqual({
      status: "captcha",
    });
    expect(await db.select().from(schema.job)).toHaveLength(0);
  });

  it("refuses entries without an address or with a bounced one", async () => {
    const none = await recipient(null);
    expect(await sendContactMessage(input(none.id))).toEqual({
      status: "unavailable",
    });
    const bounced = await recipient();
    await db
      .update(schema.entry)
      .set({ contactEmailInvalid: true })
      .where(eq(schema.entry.id, bounced.id));
    expect(await sendContactMessage(input(bounced.id))).toEqual({
      status: "unavailable",
    });
  });

  it("sends nothing to an address that used a removal link on any listing", async () => {
    const other = await recipient("Quiet@Example.org");
    await suppressEmail(db, "quiet@example.org", "claim_removal");
    expect(await sendContactMessage(input(other.id))).toEqual({
      status: "unavailable",
    });
    expect(await db.select().from(schema.job)).toHaveLength(0);
  });
});

describe("purgeContactData", () => {
  it("removes hashes older than 30 days and finished contact mails older than a day", async () => {
    const row = await recipient();
    const old = new Date(Date.now() - 31 * 86_400_000);
    await db.insert(schema.contactMessage).values([
      { entryId: row.id, senderHash: "old", createdAt: old },
      { entryId: row.id, senderHash: "new" },
    ]);
    await db.insert(schema.job).values({
      type: "email",
      payload: { template: "contact", to: "a@b.org" },
      status: "done",
    });
    await db
      .update(schema.job)
      .set({ updatedAt: new Date(Date.now() - 2 * 86_400_000) });
    expect(await purgeContactData()).toEqual({ hashes: 1, jobs: 1 });
    expect(await db.select().from(schema.contactMessage)).toHaveLength(1);
  });
});

describe("scrubContactJob", () => {
  it("drops the message text from a sent job", async () => {
    const [row] = await db
      .insert(schema.job)
      .values({
        type: "email",
        payload: { template: "contact", props: { messageText: "secret" } },
      })
      .returning();
    await scrubContactJob(row.id);
    const [after] = await db
      .select()
      .from(schema.job)
      .where(eq(schema.job.id, row.id));
    expect(after?.payload).toEqual({ template: "contact" });
  });
});
