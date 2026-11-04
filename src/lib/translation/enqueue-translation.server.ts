import type { TranslatableEntity } from "@/constants/translations";
import type { DbOrTx } from "@/db/client.server";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";

export interface IEnqueueTranslation {
  entityType: TranslatableEntity;
  entityId: string;
}

// No idempotency key, because the job compares source hashes and a key would swallow an edit returning to earlier text.
export async function enqueueTranslation(
  tx: DbOrTx,
  { entityType, entityId }: IEnqueueTranslation,
) {
  await enqueueJob(tx, {
    type: "translate",
    payload: { entityType, entityId },
    priority: 7,
  });
}
