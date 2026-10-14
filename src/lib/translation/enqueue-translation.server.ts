import type { TranslatableEntity } from "@/constants/translations";
import type { DbOrTx } from "@/db/client.server";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";

export interface IEnqueueTranslation {
  entityType: TranslatableEntity;
  entityId: string;
}

// Call inside the save transaction, after the new text is written. Always queues, with no
// idempotency key: the job compares source hashes (a repeat costs nothing), removes translations
// of emptied fields, and a key would swallow an edit that returns to an earlier text.
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
