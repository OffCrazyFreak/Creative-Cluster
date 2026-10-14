import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("invite-tokens") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const scheduled = await import("./scheduled-lifecycle.server");

describe.skipIf(!temp)("invite token retention", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  it("drops set-password links older than 90 days and keeps the rest", async () => {
    const old = new Date(Date.now() - 91 * 86_400_000);
    const later = new Date(Date.now() + 86_400_000);
    await db.insert(schema.verification).values([
      {
        identifier: "reset-password:old",
        value: "u",
        expiresAt: later,
        createdAt: old,
      },
      { identifier: "reset-password:new", value: "u", expiresAt: later },
      { identifier: "apply-old", value: "u", expiresAt: later, createdAt: old },
    ]);
    await scheduled.purgeOldInviteTokens();
    const left = (await db.select().from(schema.verification)).map(
      (row) => row.identifier,
    );
    expect(left.sort()).toEqual(["apply-old", "reset-password:new"]);
  });
});
