import { and, inArray, lt, sql } from "drizzle-orm";

import {
  CONTACT_HASH_RETENTION_DAYS,
  CONTACT_JOB_RETENTION_HOURS,
} from "@/constants/contact";
import { db } from "@/db/client.server";
import { contactMessage, job } from "@/db/schema";

const DAY_MS = 86_400_000;

// Sender hashes live 30 days; the queued mail carries the message text, so finished mails go within a day.
export async function purgeContactData(now = new Date()) {
  const hashes = await db
    .delete(contactMessage)
    .where(
      lt(
        contactMessage.createdAt,
        new Date(now.getTime() - CONTACT_HASH_RETENTION_DAYS * DAY_MS),
      ),
    )
    .returning({ id: contactMessage.id });
  const jobs = await db
    .delete(job)
    .where(
      and(
        inArray(job.status, ["done", "failed"]),
        sql`${job.payload}->>'template' = 'contact'`,
        lt(
          job.updatedAt,
          new Date(now.getTime() - CONTACT_JOB_RETENTION_HOURS * 3_600_000),
        ),
      ),
    )
    .returning({ id: job.id });
  return { hashes: hashes.length, jobs: jobs.length };
}
