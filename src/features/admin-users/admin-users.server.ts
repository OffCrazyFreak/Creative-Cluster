import { asc } from "drizzle-orm";
import { getRequestHeaders } from "@tanstack/react-start/server";

import type { UserRole } from "@/constants/roles";
import { db } from "@/db/client.server";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth/auth.server";
import { assertAdminsRemain } from "@/lib/auth/min-admins.server";

import type { IAdminUsersData } from "./admin-users-schemas";
import { pluginRole } from "./plugin-role";
import { runUserAction } from "./user-action.server";

export async function listUsers(): Promise<IAdminUsersData> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt));
  const users = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
  const activeAdmins = users.filter((u) => u.role === "admin" && !u.banned);
  return { users, activeAdmins: activeAdmins.length };
}

// Each call runs with the caller's own session so better-auth's role checks apply too.
export function setUserRole(userId: string, role: UserRole) {
  return runUserAction(() =>
    auth.api.setRole({
      body: { userId, role: pluginRole(role) },
      headers: getRequestHeaders(),
    }),
  );
}

export function banUser(userId: string, banReason: string) {
  return runUserAction(() =>
    auth.api.banUser({
      body: { userId, banReason },
      headers: getRequestHeaders(),
    }),
  );
}

export function unbanUser(userId: string) {
  return runUserAction(() =>
    auth.api.unbanUser({ body: { userId }, headers: getRequestHeaders() }),
  );
}

// better-auth revokes the sessions before it deletes, so a refused removal would still log the
// person out; checking the rule first avoids that.
export function removeUser(userId: string) {
  return runUserAction(async () => {
    await assertAdminsRemain(userId);
    await auth.api.removeUser({
      body: { userId },
      headers: getRequestHeaders(),
    });
  });
}
