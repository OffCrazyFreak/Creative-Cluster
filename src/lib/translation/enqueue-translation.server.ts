import type { TranslatableEntity } from "@/constants/translations";
import type { DbOrTx } from "@/db/client.server";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";

export interface IEnqueueTranslation {
  entityType: TranslatableEntity;
  entityId: string;
}

// Call inside the save transaction after the write; no idempotency key, because the job compares hashes and a key would swallow an edit back to earlier text.
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
