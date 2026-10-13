export const JOB_TYPES = ["translate", "email", "geocode_retry"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["queued", "running", "done", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_MAX_ATTEMPTS = 5;
