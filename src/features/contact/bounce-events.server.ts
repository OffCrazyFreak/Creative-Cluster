import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

export const BOUNCE_SOURCE = "email_webhook";

export interface IBadAddressEvent {
  address: string;
  reason: string;
}

// Entries still marked valid whose contact address matches; the lower() match follows the way
// addresses are compared everywhere else, since mail systems ignore case in practice.
async function markInvalid(address: string, reason: string) {
  await db.transaction(async (tx) => {
    const rows = await tx
      .update(entry)
      .set({ contactEmailInvalid: true })
      .where(
        and(
          sql`lower(${entry.contactEmail}) = lower(${address})`,
          eq(entry.contactEmailInvalid, false),
        ),
      )
      .returning({ id: entry.id });
    for (const { id } of rows) {
      await writeChange(tx, {
        entityType: "entry",
        entityId: id,
        userId: null,
        source: "system",
        action: "update",
        before: { contactEmailInvalid: false },
        after: { contactEmailInvalid: true },
      });
      await tx.insert(reviewItem).values({
        type: "report",
        entityType: "entry",
        entityId: id,
        // Same keys the report queue already shows, so no new review type is needed.
        payload: {
          reason: "other",
          message: `Contact email stopped working (${reason}). The contact form is switched off until the owner updates the address.`,
          source: BOUNCE_SOURCE,
        },
      });
    }
  });
}

export async function handleBadAddresses(events: IBadAddressEvent[]) {
  for (const { address, reason } of events) await markInvalid(address, reason);
}
