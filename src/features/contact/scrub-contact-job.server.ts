import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { job } from "@/db/schema";

// The privacy policy says the message is not stored; a failure is only logged: the daily purge removes the row.
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
