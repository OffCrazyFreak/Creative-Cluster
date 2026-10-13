import type { JobType } from "@/constants/jobs";

export interface IJobContext {
  id: string;
  idempotencyKey: string | null;
  priority: number;
  attempts: number;
}

// Return deferUntil to put the job back without counting the run as a failed attempt.
export type JobResult = void | { deferUntil: Date };

export type JobHandler = (
  payload: Record<string, unknown>,
  job: IJobContext,
) => Promise<JobResult>;

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
