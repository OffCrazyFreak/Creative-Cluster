import { and, eq } from "drizzle-orm";
import { APIError } from "better-auth/api";

import { MIN_ADMINS } from "@/constants/roles";
import { db } from "@/db/client.server";
import { user } from "@/db/schema";

export const MIN_ADMINS_CODE = "MIN_ADMINS";

// Locks every unbanned admin row so two concurrent demotions are checked one after the other.
export async function assertAdminsRemain(targetUserId: string) {
  await db.transaction(async (tx) => {
    const admins = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.banned, false)))
      .for("update");
    const targetIsAdmin = admins.some((admin) => admin.id === targetUserId);
    if (targetIsAdmin && admins.length - 1 < MIN_ADMINS) {
      throw APIError.from("BAD_REQUEST", {
        code: MIN_ADMINS_CODE,
        message: `There must always be at least ${MIN_ADMINS} active admins`,
      });
    }
  });
}

// Only role and ban changes can take away an admin; the target id comes from the admin endpoint body.
export async function guardAdminUpdate(
  data: Record<string, unknown>,
  targetUserId: unknown,
) {
  const removesAdmin =
    (data.role !== undefined && data.role !== "admin") || data.banned === true;
  if (removesAdmin && typeof targetUserId === "string") {
    await assertAdminsRemain(targetUserId);
  }
}
