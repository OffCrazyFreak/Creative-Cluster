import { z } from "zod";

import { MAX_SAVED_ENTRIES } from "@/constants/saved";

// Keys are entry ids or slugs; slugs match case-insensitively, so they are compared lowercased.
export const replaceSavedInput = z.object({
  keys: z
    .array(z.string().trim().toLowerCase().min(1).max(80))
    .max(MAX_SAVED_ENTRIES)
    .refine((keys) => new Set(keys).size === keys.length, {
      message: "Duplicate entries",
    }),
});
export type ReplaceSavedInput = z.infer<typeof replaceSavedInput>;

// What the map needs to star pins and list the Saved group: pins and links are keyed by slug.
export interface ISavedEntry {
  // Missing only on an entry the member just clicked, until the saved list is fetched again.
  id?: string;
  slug: string;
  name: string;
}
