import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { INVITE_EXPIRY, INVITE_TOKEN_TTL_SECONDS } from "@/constants/email";
import { db } from "@/db/client.server";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth/auth.server";
import { pageLink } from "@/lib/auth/auth-email.server";
import { createPasswordToken } from "@/lib/auth/password-token.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";

import type { InviteUserInput, UserActionResult } from "./admin-users-schemas";
import { pluginRole } from "./plugin-role";
import { runUserAction } from "./user-action.server";

async function queueInvite(
  created: { id: string; email: string },
  input: InviteUserInput,
  invitedBy: string,
) {
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
        expiry: INVITE_EXPIRY,
      },
      idempotencyKey: `invite:${created.id}`,
    });
  });
}

// The random password is never shown or mailed: the invitee sets their own through the link.
export async function inviteUser(
  input: InviteUserInput,
  invitedBy: string,
): Promise<UserActionResult> {
  const result = await runUserAction(async () => {
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
    try {
      await queueInvite(created, input, invitedBy);
    } catch (error) {
      // better-auth commits the user on its own connection; without the mail the account
      // would be invisible to the admin and block a retry with "already exists".
      await db.delete(user).where(eq(user.id, created.id));
      throw error;
    }
  });
  if (result.ok) await triggerDrain();
  return result;
}
