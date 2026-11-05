import { z } from "zod";

// About 1500 organizations fit; a JSON string stays under the hosting's roughly 6 MB request cap (unverified).
export const IMPORT_FILE_MAX_CHARS = 3_000_000;

export const importFileInputSchema = z.object({
  json: z.string().min(2).max(IMPORT_FILE_MAX_CHARS),
});
