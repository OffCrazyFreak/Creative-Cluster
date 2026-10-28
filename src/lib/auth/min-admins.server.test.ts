import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("min_admins") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { assertAdminsRemain } = await import("./min-admins.server");

describe.skipIf(!temp)("two-admin rule", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function admin(email: string, withPassword: boolean) {
    const [row] = await db
      .insert(schema.user)
      .values({ name: email, email, role: "admin", locale: "en" })
      .returning();
    if (withPassword)
      await db.insert(schema.account).values({
        accountId: row.id,
        providerId: "credential",
        userId: row.id,
        password: "hash",
      });
    return row;
  }

  it("does not count an invited admin who never set a password", async () => {
    await admin("first@example.test", true);
    const second = await admin("second@example.test", true);
    const invited = await admin("invited@example.test", false);

    await expect(assertAdminsRemain(second.id)).rejects.toThrow(/at least/);
    await expect(
      db
        .update(schema.user)
        .set({ role: "member" })
        .where(eq(schema.user.id, second.id)),
    ).rejects.toThrow();

    await expect(assertAdminsRemain(invited.id)).resolves.toBeUndefined();
    await db
      .update(schema.user)
      .set({ role: "member" })
      .where(eq(schema.user.id, invited.id));
  });
});
