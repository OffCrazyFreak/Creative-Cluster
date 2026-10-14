import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { NotFoundError } from "@/server/errors";

import { addEntry } from "../../../tests/helpers/fixture-data";
import { addOpportunity } from "../../../tests/helpers/opportunity-fixtures";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("opp_report") };
});
const verify = vi.hoisted(() => vi.fn());
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/lib/turnstile/verify-turnstile.server", () => {
  class TurnstileError extends Error {}
  verify.mockImplementation((token: string) =>
    token === "bad" ? Promise.reject(new TurnstileError()) : Promise.resolve(),
  );
  return { TurnstileError, verifyTurnstile: verify };
});
vi.mock("@/server/request.server", () => ({ clientIp: () => "203.0.113.7" }));
const { reportOpportunity } = await import("./report-opportunity.server");

function input(id: string, overrides = {}) {
  return {
    id,
    message: "Looks like spam",
    turnstileToken: "ok",
    fax: "",
    ...overrides,
  };
}

describe.skipIf(!temp)("reportOpportunity", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });
  beforeEach(async () => {
    await db.delete(schema.usageCounter);
  });

  async function post(status: "published" | "pending" = "published") {
    const owner = await addEntry(db, "Reported");
    return addOpportunity(db, owner.id, { status });
  }
  async function reports(id: string) {
    const items = await db
      .select()
      .from(schema.reviewItem)
      .where(eq(schema.reviewItem.entityId, id));
    return items.filter((item) => item.type === "report");
  }

  it("queues a report item for the admin and hides nothing", async () => {
    const found = await post();
    expect(await reportOpportunity(input(found.id))).toEqual({ status: "ok" });
    const [item] = await reports(found.id);
    expect(item).toMatchObject({ entityType: "opportunity", status: "open" });
    expect(item.payload).toEqual({ message: "Looks like spam" });
    const [still] = await db
      .select()
      .from(schema.opportunity)
      .where(eq(schema.opportunity.id, found.id));
    expect(still.status).toBe("published");
  });

  it("drops bot submissions quietly and rejects a failed check", async () => {
    const found = await post();
    expect(await reportOpportunity(input(found.id, { fax: "x" }))).toEqual({
      status: "ok",
    });
    expect(
      await reportOpportunity(input(found.id, { turnstileToken: "bad" })),
    ).toEqual({ status: "captcha" });
    expect(await reports(found.id)).toHaveLength(0);
  });

  it("lets one visitor report a post twice a day and 5 posts an hour", async () => {
    const found = await post();
    await reportOpportunity(input(found.id));
    await reportOpportunity(input(found.id));
    expect(await reportOpportunity(input(found.id))).toEqual({
      status: "limited",
    });
    expect(await reports(found.id)).toHaveLength(2);
    await db.delete(schema.usageCounter);
    for (let i = 0; i < 5; i += 1)
      await reportOpportunity(input((await post()).id));
    expect(await reportOpportunity(input((await post()).id))).toEqual({
      status: "limited",
    });
  });

  it("refuses posts a visitor cannot open and leaves no counter rows behind", async () => {
    const found = await post("pending");
    await expect(reportOpportunity(input(found.id))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const ended = await post();
    await db
      .update(schema.opportunity)
      .set({ expiresAt: new Date(Date.now() - 40 * 86_400_000) })
      .where(eq(schema.opportunity.id, ended.id));
    await expect(reportOpportunity(input(ended.id))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await db.select().from(schema.usageCounter)).toHaveLength(0);
  });
});
