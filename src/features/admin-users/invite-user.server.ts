import { eq } from "drizzle-orm";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { INVITE_EXPIRY, INVITE_TOKEN_TTL_SECONDS } from "@/constants/email";
import { db } from "@/db/client.server";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth/auth.server";
import { runInBackground } from "@/lib/auth/background-task.server";
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
    // Created as a member and promoted here: an admin row would trip the 2-admin trigger if the
    // cleanup below ever had to delete it.
    await tx
      .update(user)
      .set({ invitedBy, role: input.role })
      .where(eq(user.id, created.id));
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

// No password is set here: the invitee chooses one through the link, which creates the credential.
export async function inviteUser(
  input: InviteUserInput,
  invitedBy: string,
): Promise<UserActionResult> {
  const result = await runUserAction(async () => {
    const { user: created } = await auth.api.createUser({
      body: {
        email: input.email,
        name: input.name,
        role: pluginRole("member"),
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
  // Delivery is not part of the click; the 15 minute schedule is the fallback.
  if (result.ok) runInBackground(triggerDrain());
  return result;
}
