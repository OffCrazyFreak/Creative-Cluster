import { env } from "@/env.server";

import { standInAdapter } from "./standin-adapter";
import type { ITranslationAdapter } from "./translation-adapter";
import { createWorkersAiAdapter } from "./workers-ai-adapter";

export function getTranslationAdapter(): ITranslationAdapter {
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_TOKEN) {
    return createWorkersAiAdapter({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_AI_TOKEN,
    });
  }
  return standInAdapter;
}
