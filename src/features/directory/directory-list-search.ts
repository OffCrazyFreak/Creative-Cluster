import { z } from "zod";

export const DIRECTORY_LIST_SEARCH_DEFAULTS = { page: 1 } as const;

export const directoryListSearchSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .transform((value) => value ?? 1)
    .catch(1),
});
