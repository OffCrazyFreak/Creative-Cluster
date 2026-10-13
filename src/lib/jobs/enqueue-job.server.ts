import type { DbOrTx } from "@/db/client.server";
import { job } from "@/db/schema";
import type { JobType } from "@/constants/jobs";

export interface IEnqueueJob {
  type: JobType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: number;
  runAt?: Date;
}

// Called inside the transaction that caused the side effect, so both commit or neither does.
export async function enqueueJob(tx: DbOrTx, input: IEnqueueJob) {
  await tx
    .insert(job)
    .values({
      type: input.type,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      priority: input.priority ?? 5,
      runAt: input.runAt ?? new Date(),
    })
    .onConflictDoNothing({ target: job.idempotencyKey });
}
