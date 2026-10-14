import { z } from "zod";

// The browser sends the file as text; about 1500 organizations fit, and a JSON string field stays under the roughly 6 MB request cap of the hosting functions (unverified).
export const IMPORT_FILE_MAX_CHARS = 3_000_000;

export const importFileInputSchema = z.object({
  json: z.string().min(2).max(IMPORT_FILE_MAX_CHARS),
});
