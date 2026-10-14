import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { CLAIM_INVITE_TTL_DAYS } from "@/constants/import";
import { db } from "@/db/client.server";
import { claimInvite, entry } from "@/db/schema";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { site } from "@/sites";

import { claimEmailProps } from "./claim-email-props.server";
import { openInviteCondition } from "./claim-state.server";
import { suppressedAmong } from "./email-suppression.server";
import {
  listUnsentInvites,
  type IPreparedInvite,
} from "./prepare-claims.server";

// One mail per address: a contact of several listings is written to once, the rest wait.
export async function mailableInvites(): Promise<IPreparedInvite[]> {
  const candidates = await listUnsentInvites();
  if (candidates.length === 0) return [];
  const mailed = await db
    .select({ email: claimInvite.email })
    .from(claimInvite)
    .where(
      and(
        isNotNull(claimInvite.sentAt),
        inArray(claimInvite.email, [
          ...new Set(candidates.map((c) => c.email)),
        ]),
      ),
    );
  const taken = new Set(mailed.map((row) => row.email));
  return candidates.filter((row) => {
    if (taken.has(row.email)) return false;
    taken.add(row.email);
    return true;
  });
}

async function queueInvite(invite: IPreparedInvite, importSource: string) {
  return db.transaction(async (tx) => {
    // Two overlapping runs must not both mail one address through different invites.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${invite.email}))`,
    );
    const [locked] = await tx
      .select({ id: claimInvite.id })
      .from(claimInvite)
      .innerJoin(entry, eq(entry.id, claimInvite.entryId))
      .where(
        and(
          eq(claimInvite.id, invite.inviteId),
          isNull(claimInvite.sentAt),
          openInviteCondition,
        ),
      )
      .for("update", { of: claimInvite });
    if (!locked) return false;
    if ((await suppressedAmong(tx, [invite.email])).size > 0) return false;
    const [other] = await tx
      .select({ id: claimInvite.id })
      .from(claimInvite)
      .where(
        and(eq(claimInvite.email, invite.email), isNotNull(claimInvite.sentAt)),
      )
      .limit(1);
    if (other) return false;
    await tx
      .update(claimInvite)
      .set({
        sentAt: new Date(),
        expiresAt: sql`now() + make_interval(days => ${CLAIM_INVITE_TTL_DAYS})`,
      })
      .where(eq(claimInvite.id, invite.inviteId));
    await enqueueEmail(tx, {
      template: "claim",
      to: invite.email,
      props: claimEmailProps(invite, importSource),
      idempotencyKey: `claim:${invite.inviteId}`,
      replyTo: site.contactEmail,
    });
    return true;
  });
}

// The first mail restarts the 30 days, so a long wait between prepare and send does not eat into the links.
// Candidates that turn stale between listing and locking are skipped and replaced, so the batch fills up.
export async function sendInvites(limit: number, importSource: string) {
  let sent = 0;
  for (const invite of await mailableInvites()) {
    if (sent >= limit) break;
    if (await queueInvite(invite, importSource)) sent += 1;
  }
  return sent;
}
