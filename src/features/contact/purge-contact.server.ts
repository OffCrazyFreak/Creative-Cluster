import { and, inArray, lt, sql } from "drizzle-orm";

import {
  CONTACT_HASH_RETENTION_DAYS,
  CONTACT_JOB_RETENTION_HOURS,
  DAY_MS,
  HOUR_MS,
} from "@/constants/contact";
import { db } from "@/db/client.server";
import { contactMessage, job } from "@/db/schema";

// Sender hashes live 30 days. Sent contact mails are scrubbed at once; this removes finished rows and failed ones that still hold text.
export async function purgeContactData(now = new Date()) {
  const hashes = db
    .delete(contactMessage)
    .where(
      lt(
        contactMessage.createdAt,
        new Date(now.getTime() - CONTACT_HASH_RETENTION_DAYS * DAY_MS),
      ),
    )
    .returning({ id: contactMessage.id });
  const jobs = db
    .delete(job)
    .where(
      and(
        inArray(job.status, ["done", "failed"]),
        sql`${job.payload}->>'template' = 'contact'`,
        lt(
          job.updatedAt,
          new Date(now.getTime() - CONTACT_JOB_RETENTION_HOURS * HOUR_MS),
        ),
      ),
    )
    .returning({ id: job.id });
  // Independent deletes: one failing must not leave the other undone. The first error is rethrown.
  const [hashRows, jobRows] = await Promise.allSettled([hashes, jobs]);
  if (hashRows.status === "rejected") throw hashRows.reason;
  if (jobRows.status === "rejected") throw jobRows.reason;
  return { hashes: hashRows.value.length, jobs: jobRows.value.length };
}
