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

  async function admin(email: string, provider: string | null) {
    const [row] = await db
      .insert(schema.user)
      .values({ name: email, email, role: "admin", locale: "en" })
      .returning();
    if (provider)
      await db.insert(schema.account).values({
        accountId: row.id,
        providerId: provider,
        userId: row.id,
      });
    return row;
  }

  function demote(userId: string) {
    return db
      .update(schema.user)
      .set({ role: "member" })
      .where(eq(schema.user.id, userId));
  }

  it("does not count an invited admin who never signed in", async () => {
    await admin("first@example.test", "credential");
    const second = await admin("second@example.test", "google");
    const invited = await admin("invited@example.test", null);

    await expect(assertAdminsRemain(second.id)).rejects.toThrow(/at least/);
    await expect(demote(second.id)).rejects.toThrow();
    // better-auth removes the sign-in methods before the user row, so that step is guarded too.
    await expect(
      db.delete(schema.account).where(eq(schema.account.userId, second.id)),
    ).rejects.toThrow();

    await expect(assertAdminsRemain(invited.id)).resolves.toBeUndefined();
    await demote(invited.id);
    await db.delete(schema.user).where(eq(schema.user.id, invited.id));
  });

  it("still lets a counted admin go when two others remain", async () => {
    const extra = await admin("third@example.test", "credential");
    await expect(assertAdminsRemain(extra.id)).resolves.toBeUndefined();
    await db.delete(schema.account).where(eq(schema.account.userId, extra.id));
    await db.delete(schema.user).where(eq(schema.user.id, extra.id));
  });
});
