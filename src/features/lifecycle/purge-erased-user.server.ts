import { and, eq, like, lte } from "drizzle-orm";

import {
  ERASURE_GRACE_DAYS,
  ERASURE_MARKER_PREFIX,
} from "@/constants/lifecycle";
import { LOCALES } from "@/constants/locales";
import { db } from "@/db/client.server";
import { entry, verification } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { site } from "@/sites";

import { purgeEntry, scrubSentEmails } from "./purge-entry.server";

interface IErasedAccount {
  id: string;
  email: string;
  locale?: string | null;
}

// Purges an account's data once its erasure grace period is over; safe to run twice. The marker stays until the
// account row is gone, so a failed account delete is retried. The better-auth user delete hook calls this too,
// but only acts for a due marker, so an admin removing an account (which leaves listings alone) is not an erasure.
export async function purgeErasedUser(
  account: IErasedAccount,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - ERASURE_GRACE_DAYS * 86_400_000);
  const identifier = `${ERASURE_MARKER_PREFIX}${account.id}`;
  const purged = await db.transaction(async (tx) => {
    const [due] = await tx
      .select({ id: verification.id })
      .from(verification)
      .where(
        and(
          eq(verification.identifier, identifier),
          lte(verification.createdAt, cutoff),
        ),
      )
      .limit(1)
      .for("update");
    if (!due) return false;

    const owned = await tx
      .select({ id: entry.id, name: entry.name })
      .from(entry)
      .where(eq(entry.ownerUserId, account.id));
    for (const item of owned) await purgeEntry(tx, item.id);
    // Set-password and reset links for this account must not outlive it.
    await tx
      .delete(verification)
      .where(
        and(
          like(verification.identifier, "reset-password:%"),
          eq(verification.value, account.id),
        ),
      );
    await scrubSentEmails(tx, account.email);
    const locale = LOCALES.find((l) => l === account.locale) ?? site.baseLocale;
    await enqueueEmail(tx, {
      template: "erasure_done",
      to: account.email,
      props: { locale, entryName: owned[0]?.name ?? null },
      idempotencyKey: `erasure-done:${account.id}`,
    });
    return true;
  });
  if (purged) invalidateMapDirectory();
  return purged;
}
