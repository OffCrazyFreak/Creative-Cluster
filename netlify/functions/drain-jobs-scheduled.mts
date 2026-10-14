import type { Config } from "@netlify/functions";

import { drainJobs } from "../../src/lib/jobs/drain-jobs.server";

// Safety net for saves whose trigger failed, and for jobs that were deferred or retried.
export default async () => {
  const result = await drainJobs(20_000);
  console.info("drain-jobs-scheduled", result);
};

export const config: Config = { schedule: "*/15 * * * *" };
