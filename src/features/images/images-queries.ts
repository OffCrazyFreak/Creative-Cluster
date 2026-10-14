import { mutationOptions } from "@tanstack/react-query";

import { uploadImage } from "./images.functions";

export function uploadImageMutationOptions() {
  return mutationOptions({
    mutationFn: (form: FormData) => uploadImage({ data: form }),
  });
}
