import type { JobType } from "@/constants/jobs";

export interface IJobContext {
  id: string;
  idempotencyKey: string | null;
  priority: number;
  attempts: number;
  // Epoch ms after which the drain stops; slow handlers check it between steps and defer.
  deadline: number;
}

// Return deferUntil to put the job back without counting the run as a failed attempt.
export type JobResult = void | { deferUntil: Date };

export type JobHandler = (
  payload: Record<string, unknown>,
  job: IJobContext,
) => Promise<JobResult>;

// Throw this when retrying cannot help (malformed payload): the job fails at once.
export class PermanentJobError extends Error {}

const handlers = new Map<JobType, JobHandler>();

export function registerJobHandler(type: JobType, handler: JobHandler) {
  handlers.set(type, handler);
}

export function registeredJobTypes(): JobType[] {
  return [...handlers.keys()];
}

export function jobHandlerFor(type: JobType): JobHandler | undefined {
  return handlers.get(type);
}
