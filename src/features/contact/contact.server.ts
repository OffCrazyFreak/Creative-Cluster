import { and, count, eq, gte, sql, type SQL } from "drizzle-orm";

import {
  CONTACT_LIMITS,
  CONTACT_MIN_FILL_MS,
  HOUR_MS,
} from "@/constants/contact";
import { db, type DbOrTx } from "@/db/client.server";
import { contactMessage, entry } from "@/db/schema";
import { startOfUtcDay } from "@/lib/email/email-budget.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import {
  TurnstileError,
  verifyTurnstile,
} from "@/lib/turnstile/verify-turnstile.server";
import { LimitError, NotFoundError } from "@/server/errors";
import { UNKNOWN_IP, clientIp } from "@/server/request.server";
import { site } from "@/sites";

import { publicEntryCondition } from "../entry/public-entry-filter.server";
import type { ContactInput, ContactResult } from "./contact-schemas";
import { senderHash } from "./sender-hash.server";

// One lock for the whole table: the three limits read overlapping rows, and volume is tiny.
const LOCK_KEY = 7_340_001;

function looksAutomated(input: ContactInput): boolean {
  return input.fax !== "" || input.filledMs < CONTACT_MIN_FILL_MS;
}

async function countSince(tx: DbOrTx, since: Date, extra?: SQL) {
  const [row] = await tx
    .select({ total: count() })
    .from(contactMessage)
    .where(and(gte(contactMessage.createdAt, since), extra));
  return row?.total ?? 0;
}

async function findRecipient(tx: DbOrTx, entryId: string) {
  const [row] = await tx
    .select({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      contactEmail: entry.contactEmail,
    })
    .from(entry)
    .where(
      and(
        eq(entry.id, entryId),
        publicEntryCondition(),
        eq(entry.contactEmailInvalid, false),
      ),
    )
    .limit(1);
  if (!row?.contactEmail) throw new NotFoundError();
  return { ...row, contactEmail: row.contactEmail };
}

function reportLink(entryName: string): string {
  const subject = encodeURIComponent(`Report: ${entryName}`);
  return `mailto:${site.contactEmail}?subject=${subject}`;
}

// The limit reads, the hash row and the queued mail share one transaction, so a refused or
// failed attempt leaves nothing behind and parallel requests cannot all pass the check.
async function relay(input: ContactInput, now: Date) {
  const hash = senderHash(input.email);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${LOCK_KEY})`);
    const recipient = await findRecipient(tx, input.entryId);
    const bySender = await countSince(
      tx,
      new Date(now.getTime() - HOUR_MS),
      eq(contactMessage.senderHash, hash),
    );
    const byEntry = await countSince(
      tx,
      startOfUtcDay(now),
      eq(contactMessage.entryId, recipient.id),
    );
    const bySite = await countSince(tx, startOfUtcDay(now));
    if (
      bySender >= CONTACT_LIMITS.perSenderPerHour ||
      byEntry >= CONTACT_LIMITS.perEntryPerDay ||
      bySite >= CONTACT_LIMITS.perSitePerDay
    ) {
      throw new LimitError();
    }
    const [row] = await tx
      .insert(contactMessage)
      .values({ entryId: recipient.id, senderHash: hash })
      .returning({ id: contactMessage.id });
    await enqueueEmail(tx, {
      template: "contact",
      to: recipient.contactEmail,
      replyTo: input.email,
      idempotencyKey: `contact:${row.id}`,
      props: {
        locale: input.locale,
        entryName: recipient.name,
        senderName: input.name,
        senderEmail: input.email,
        messageText: input.message,
        link: reportLink(recipient.name),
      },
    });
    return recipient.kind;
  });
}

export async function sendContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  const now = new Date();
  // Bots get the success answer and nothing is sent, so they learn nothing about the checks.
  if (looksAutomated(input)) return { status: "sent", kind: null };
  try {
    await verifyTurnstile(input.turnstileToken);
    // Without a trusted address everyone would share one bucket, so only the other limits apply.
    const ip = clientIp();
    if (ip !== UNKNOWN_IP) {
      await enforceLimits([
        {
          key: `contact-ip:${ip}`,
          max: CONTACT_LIMITS.perIpPerHour,
          windowSeconds: 3600,
        },
      ]);
    }
    const kind = await relay(input, now);
    await triggerDrain();
    return { status: "sent", kind };
  } catch (error) {
    if (error instanceof TurnstileError) return { status: "captcha" };
    if (error instanceof LimitError) return { status: "limited" };
    throw error;
  }
}
