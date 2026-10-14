import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { job } from "@/db/schema";

// The job row carries the visitor's text only until the mail is out; the privacy policy says the
// message itself is not stored. A failure is logged, and the daily purge removes the row anyway.
export async function scrubContactJob(jobId: string) {
  try {
    await db
      .update(job)
      .set({ payload: sql`jsonb_build_object('template', 'contact')` })
      .where(eq(job.id, jobId));
  } catch (error) {
    console.error("could not scrub a sent contact job", jobId, error);
  }
}
