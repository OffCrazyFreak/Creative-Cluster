import type { TranslatableEntity } from "@/constants/translations";
import type { DbOrTx } from "@/db/client.server";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";

export interface IEnqueueTranslation {
  entityType: TranslatableEntity;
  entityId: string;
}

// Call inside the save transaction after the write; no idempotency key, or an edit back to earlier text is lost.
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
