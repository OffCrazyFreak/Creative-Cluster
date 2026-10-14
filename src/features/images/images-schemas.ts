import { z } from "zod";

import { IMAGE_KINDS } from "@/constants/images";

// The browser sends the already cropped image as FormData: file and kind.
export const uploadImageInput = z
  .instanceof(FormData)
  .transform((form) => Object.fromEntries(form.entries()))
  .pipe(
    z.object({
      file: z.instanceof(File),
      kind: z.enum(IMAGE_KINDS),
    }),
  );

export type UploadImageInput = z.output<typeof uploadImageInput>;
