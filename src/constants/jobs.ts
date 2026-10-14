export const JOB_TYPES = ["translate", "email", "geocode_retry"] as const;
export type JobType = (typeof JOB_TYPES)[number];

// Jobs that can run for minutes (model calls): only the background drain may claim them, because
// the scheduled function is cut off after about 30 seconds.
export const SLOW_JOB_TYPES: readonly JobType[] = ["translate"];

export const JOB_STATUSES = ["queued", "running", "done", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_MAX_ATTEMPTS = 5;
