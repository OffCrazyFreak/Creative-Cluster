import { afterAll, describe, expect, it, vi } from "vitest";

import { job } from "@/db/schema";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("email_budget") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({ env: { EMAIL_DAILY_CAP: 100 } }));
const { countSentToday } = await import("./email-budget.server");

function emailJob(status: "done" | "running", lockedAt: Date | null) {
  return { type: "email" as const, payload: {}, status, lockedAt };
}

describe.skipIf(!temp)("countSentToday", () => {
  afterAll(async () => {
    await temp?.drop();
  });

  it("counts sent mail and other drains' mail, not the rest of this drain's batch", async () => {
    const db = temp!.db;
    const batch = new Date();
    const other = new Date(batch.getTime() - 1000);
    const [current] = await db
      .insert(job)
      .values([
        emailJob("running", batch),
        ...Array.from({ length: 9 }, () => emailJob("running", batch)),
        emailJob("done", null),
        emailJob("done", null),
        emailJob("running", other),
      ])
      .returning();
    expect(await countSentToday(new Date(), current.id)).toBe(3);
  });
});
