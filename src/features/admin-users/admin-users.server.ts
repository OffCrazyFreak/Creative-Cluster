import { randomBytes } from "node:crypto";

import { asc, eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { INVITE_TOKEN_TTL_SECONDS } from "@/constants/email";
import type { UserRole } from "@/constants/roles";
import { db } from "@/db/client.server";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth/auth.server";
import { pageLink } from "@/lib/auth/auth-email.server";
import { MIN_ADMINS_CODE } from "@/lib/auth/min-admins.server";
import { createPasswordToken } from "@/lib/auth/password-token.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";

import type {
  IAdminUsersData,
  InviteUserInput,
  UserActionError,
  UserActionResult,
} from "./admin-users-schemas";

// The admin plugin's types only know "admin" and "user"; our member role is stored as plain text.
function pluginRole(role: UserRole) {
  return role as "admin" | "user";
}

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

function toActionError(error: unknown): UserActionError {
  if (error instanceof APIError) {
    const code = (error.body as { code?: string } | undefined)?.code;
    if (code === MIN_ADMINS_CODE) return "min_admins";
    if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "exists";
  }
  console.error("admin user action failed", error);
  return "failed";
}

// Runs a better-auth admin call with the caller's own session so its role checks apply too.
async function run(action: () => Promise<unknown>): Promise<UserActionResult> {
  try {
    await action();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export function setUserRole(userId: string, role: UserRole) {
  return run(() =>
    auth.api.setRole({
      body: { userId, role: pluginRole(role) },
      headers: getRequestHeaders(),
    }),
  );
}

export function banUser(userId: string, banReason: string) {
  return run(() =>
    auth.api.banUser({
      body: { userId, banReason },
      headers: getRequestHeaders(),
    }),
  );
}

export function unbanUser(userId: string) {
  return run(() =>
    auth.api.unbanUser({ body: { userId }, headers: getRequestHeaders() }),
  );
}

export function removeUser(userId: string) {
  return run(() =>
    auth.api.removeUser({ body: { userId }, headers: getRequestHeaders() }),
  );
}

// The random password is never shown or mailed: the invitee sets their own through the link.
export async function inviteUser(
  input: InviteUserInput,
  invitedBy: string,
): Promise<UserActionResult> {
  const result = await run(async () => {
    const { user: created } = await auth.api.createUser({
      body: {
        email: input.email,
        name: input.name,
        password: randomBytes(32).toString("base64url"),
        role: pluginRole(input.role),
        data: { emailVerified: true, locale: input.locale },
      },
      headers: getRequestHeaders(),
    });
    await db.transaction(async (tx) => {
      await tx.update(user).set({ invitedBy }).where(eq(user.id, created.id));
      const token = await createPasswordToken(
        tx,
        created.id,
        INVITE_TOKEN_TTL_SECONDS,
      );
      await enqueueEmail(tx, {
        template: "invite",
        to: created.email,
        props: {
          locale: input.locale,
          link: pageLink(
            `/set-password?token=${encodeURIComponent(token)}`,
            input.locale,
          ),
          expiry: "days7",
        },
        idempotencyKey: `invite:${created.id}`,
      });
    });
  });
  if (result.ok) await triggerDrain();
  return result;
}
