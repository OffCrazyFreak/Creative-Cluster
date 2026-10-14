import type { Config } from "@netlify/functions";

import { SLOW_JOB_TYPES } from "../../src/constants/jobs";
import { drainJobs, hasDueJobs } from "../../src/lib/jobs/drain-jobs.server";
import { triggerDrain } from "../../src/lib/jobs/trigger-drain.server";

// Safety net for saves whose trigger failed, and for jobs that were deferred or retried.
export default async () => {
  const result = await drainJobs(20_000, { skipTypes: SLOW_JOB_TYPES });
  console.info("drain-jobs-scheduled", result);
  // Slow jobs (translation) would be killed here, so the background function takes them.
  if (await hasDueJobs(SLOW_JOB_TYPES)) await triggerDrain();
};

export const config: Config = { schedule: "*/15 * * * *" };
