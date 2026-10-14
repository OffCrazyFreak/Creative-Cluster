import { z } from "zod";

// The browser sends the file as text; about 2000 organizations fit well below this.
export const IMPORT_FILE_MAX_CHARS = 5_000_000;

export const importFileInputSchema = z.object({
  json: z.string().min(2).max(IMPORT_FILE_MAX_CHARS),
});
