import { z } from "zod";

import { TRANSLATABLE_ENTITIES } from "@/constants/translations";
import { db } from "@/db/client.server";
import {
  PermanentJobError,
  registerJobHandler,
  type JobHandler,
} from "@/lib/jobs/job-registry.server";

import { getTranslationAdapter } from "./get-translation-adapter.server";
import { runTranslation } from "./run-translation.server";

const payloadSchema = z.object({
  entityType: z.enum(TRANSLATABLE_ENTITIES),
  entityId: z.uuid(),
});

function handleTranslateJob(...[payload]: Parameters<JobHandler>) {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success)
    throw new PermanentJobError("Malformed translate job payload");
  return runTranslation(db, getTranslationAdapter(), parsed.data);
}

registerJobHandler("translate", handleTranslateJob);
