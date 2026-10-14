import { createHmac } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { addEntry } from "../../../tests/helpers/fixture-data";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("webhook") };
});
const secretBytes = Buffer.from("test-signing-secret-bytes-0123456");
const config = vi.hoisted(() => ({ secret: undefined as string | undefined }));
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({
  env: {
    get RESEND_WEBHOOK_SECRET() {
      return config.secret;
    },
  },
}));

const { handleResendWebhook } = await import("./resend-webhook.server");
const db = temp!.db;

function signed(body: object, signWith = secretBytes) {
  const payload = JSON.stringify(body);
  const id = "msg_test1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", signWith)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body: payload,
    headers: {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
  });
}

function event(type: string, to: string, extra: object = {}) {
  return {
    type,
    created_at: new Date().toISOString(),
    data: { email_id: "e1", to: [to], ...extra },
  };
}

async function entryWith(email: string) {
  const row = await addEntry(db, "Bounce Studio");
  await db
    .update(schema.entry)
    .set({ contactEmail: email })
    .where(eq(schema.entry.id, row.id));
  return row.id;
}

async function invalid(id: string) {
  const [row] = await db
    .select({ flag: schema.entry.contactEmailInvalid })
    .from(schema.entry)
    .where(eq(schema.entry.id, id));
  return row?.flag;
}

beforeEach(async () => {
  config.secret = `whsec_${secretBytes.toString("base64")}`;
  await db.delete(schema.reviewItem);
  await db.delete(schema.changeLog);
});
afterAll(() => temp?.drop());

describe("resend webhook", () => {
  it("answers 503 and changes nothing while the secret is unset", async () => {
    config.secret = undefined;
    const id = await entryWith("gone@example.org");
    const res = await handleResendWebhook(
      signed(event("email.complained", "gone@example.org")),
    );
    expect(res.status).toBe(503);
    expect(await invalid(id)).toBe(false);
  });

  it("rejects a bad signature", async () => {
    const id = await entryWith("forged@example.org");
    const res = await handleResendWebhook(
      signed(event("email.complained", "forged@example.org"), Buffer.from("x")),
    );
    expect(res.status).toBe(400);
    expect(await invalid(id)).toBe(false);
  });

  it("flags matching entries on a permanent bounce and queues one review item", async () => {
    const id = await entryWith("Owner@Example.org");
    const bounce = event("email.bounced", "owner@example.org", {
      bounce: { type: "Permanent", subType: "General", message: "no mailbox" },
    });
    expect((await handleResendWebhook(signed(bounce))).status).toBe(200);
    expect(await invalid(id)).toBe(true);
    // Resend retries deliveries: the replay must not queue a second item.
    expect((await handleResendWebhook(signed(bounce))).status).toBe(200);
    const items = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, id));
    expect(items).toHaveLength(1);
    expect(items[0]?.type).toBe("report");
    expect(await db.select().from(schema.changeLog)).toHaveLength(1);
  });

  it("flags on complaint and suppression", async () => {
    const a = await entryWith("spam@example.org");
    const b = await entryWith("sup@example.org");
    await handleResendWebhook(
      signed(event("email.complained", "spam@example.org")),
    );
    await handleResendWebhook(
      signed(
        event("email.suppressed", "sup@example.org", {
          suppressed: { type: "OnAccountSuppressionList", message: "x" },
        }),
      ),
    );
    expect([await invalid(a), await invalid(b)]).toEqual([true, true]);
  });

  it("ignores transient bounces, send failures and other events", async () => {
    const id = await entryWith("slow@example.org");
    await handleResendWebhook(
      signed(
        event("email.bounced", "slow@example.org", {
          bounce: {
            type: "Transient",
            subType: "MailboxFull",
            message: "full",
          },
        }),
      ),
    );
    await handleResendWebhook(
      signed(
        event("email.failed", "slow@example.org", { failed: { reason: "x" } }),
      ),
    );
    const res = await handleResendWebhook(
      signed(event("email.delivered", "slow@example.org")),
    );
    expect(res.status).toBe(200);
    expect(await invalid(id)).toBe(false);
  });

  it("rejects missing headers and a body that differs from the signed one", async () => {
    const id = await entryWith("tamper@example.org");
    const ok = signed(event("email.complained", "other@example.org"));
    const tampered = new Request(ok.url, {
      method: "POST",
      body: JSON.stringify(event("email.complained", "tamper@example.org")),
      headers: ok.headers,
    });
    expect((await handleResendWebhook(tampered)).status).toBe(400);
    const bare = new Request(ok.url, { method: "POST", body: "{}" });
    expect((await handleResendWebhook(bare)).status).toBe(400);
    expect(await invalid(id)).toBe(false);
  });

  it("answers 500 on a database failure so Resend retries", async () => {
    await entryWith("retry@example.org");
    const spy = vi
      .spyOn(db, "transaction")
      .mockRejectedValueOnce(new Error("down"));
    const res = await handleResendWebhook(
      signed(event("email.complained", "retry@example.org")),
    );
    spy.mockRestore();
    expect(res.status).toBe(500);
  });

  it("drops a signed event of an unexpected shape with a 200", async () => {
    const res = await handleResendWebhook(
      signed({ type: "email.bounced", created_at: "x", data: { to: [] } }),
    );
    expect(res.status).toBe(200);
  });

  it("matches a bracketed address and ignores multi-recipient events", async () => {
    const id = await entryWith("bracket@example.org");
    const other = await entryWith("pair@example.org");
    await handleResendWebhook(
      signed(event("email.complained", "Name <Bracket@example.org>")),
    );
    await handleResendWebhook(
      signed({
        type: "email.complained",
        created_at: "x",
        data: { email_id: "e", to: ["pair@example.org", "x@example.org"] },
      }),
    );
    expect(await invalid(id)).toBe(true);
    expect(await invalid(other)).toBe(false);
  });
});
