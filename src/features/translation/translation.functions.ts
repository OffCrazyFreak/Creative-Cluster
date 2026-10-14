import { createServerFn } from "@tanstack/react-start";

import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import { memberGuard, publicGuard } from "@/server/guards";

import { saveOwnerTranslation } from "./save-translation.server";
import {
  saveTranslationInputSchema,
  translationViewInputSchema,
} from "./translation-schemas";
import { loadEntryTranslation } from "./translation-view.server";

export const getEntryTranslation = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(translationViewInputSchema)
  .handler(({ data, context }) =>
    loadEntryTranslation(
      data.entryId,
      data.locale,
      context.session?.user.id ?? null,
    ),
  );

export const saveEntryTranslation = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(saveTranslationInputSchema)
  .handler(async ({ data, context }) => {
    const { enqueued } = await saveOwnerTranslation(context.user.id, data);
    if (enqueued) await triggerDrain();
  });
