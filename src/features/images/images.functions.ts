import { createServerFn } from "@tanstack/react-start";

import { memberGuard } from "@/server/guards";

import { uploadImageInput } from "./images-schemas";
import { storeImage } from "./images.server";

export const uploadImage = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(uploadImageInput)
  .handler(({ data, context }) =>
    storeImage({ userId: context.user.id, ...data }),
  );
