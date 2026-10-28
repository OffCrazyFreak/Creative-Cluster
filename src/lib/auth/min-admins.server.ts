import { and, eq, exists } from "drizzle-orm";
import { APIError } from "better-auth/api";

import { MIN_ADMINS } from "@/constants/roles";
import { db } from "@/db/client.server";
import { account, user } from "@/db/schema";

export const MIN_ADMINS_CODE = "MIN_ADMINS";

// Gives the admin a clear message before better-auth writes. A row lock here could not span
// that write, so migration 0003 (a trigger with an advisory lock) is what holds the rule when
// two changes race, and it also covers any path that reaches the update without a known target.
// Only admins who chose a password count: an invite to a wrong address must not stand in for a second admin.
export async function assertAdminsRemain(targetUserId: string) {
  const admins = await db
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        eq(user.role, "admin"),
        eq(user.banned, false),
        exists(
          db
            .select({ id: account.id })
            .from(account)
            .where(
              and(
                eq(account.userId, user.id),
                eq(account.providerId, "credential"),
              ),
            ),
        ),
      ),
    );
  const targetIsAdmin = admins.some((admin) => admin.id === targetUserId);
  if (targetIsAdmin && admins.length - 1 < MIN_ADMINS) {
    throw APIError.from("BAD_REQUEST", {
      code: MIN_ADMINS_CODE,
      message: `There must always be at least ${MIN_ADMINS} active admins`,
    });
  }
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
