import type { ITranslationAdapter } from "./translation-adapter";

// Used while CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_TOKEN is missing: nothing is translated or
// stored, so pages show the original text.
export const standInAdapter: ITranslationAdapter = {
  name: "stand-in",
  translate() {
    return Promise.resolve(null);
  },
};
