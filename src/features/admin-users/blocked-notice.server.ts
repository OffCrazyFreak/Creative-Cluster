import { eq } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { user } from "@/db/schema";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";

// The Digital Services Act requires a statement of reasons. The ban itself is already done by
// better-auth, so a failure here is logged instead of turning a successful block into an error.
export async function sendBlockedNotice(userId: string, reason: string) {
  try {
    const [person] = await db
      .select({ email: user.email, name: user.name, locale: user.locale })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!person) return;
    await enqueueEmail(db, {
      template: "blocked",
      to: person.email,
      // Per minute: a double click sends one notice, a later re-block after unblocking sends another.
      idempotencyKey: `blocked:${userId}:${Math.floor(Date.now() / 60_000)}`,
      props: { locale: person.locale as AppLocale, name: person.name, reason },
    });
    await triggerDrain();
  } catch (error) {
    console.error("could not queue the account blocked notice", userId, error);
  }
}
