import type { TranslatableEntity } from "@/constants/translations";
import type { DbOrTx } from "@/db/client.server";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";

import { loadTranslationSource } from "./translation-source.server";

export interface IEnqueueTranslation {
  entityType: TranslatableEntity;
  entityId: string;
}

// Call inside the save transaction, after the new text is written. No idempotency key: the job
// compares source hashes, so a repeat costs nothing, while a key would swallow edits that
// return to an earlier text.
export async function enqueueTranslation(
  tx: DbOrTx,
  { entityType, entityId }: IEnqueueTranslation,
) {
  const source = await loadTranslationSource(tx, entityType, entityId);
  if (!source || source.fields.length === 0) return;
  await enqueueJob(tx, {
    type: "translate",
    payload: { entityType, entityId },
    priority: 7,
  });
}
