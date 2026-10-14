import { createServerFn } from "@tanstack/react-start";

import { publicGuard } from "@/server/guards";

import { contactSchema } from "./contact-schemas";
import { sendContactMessage } from "./contact.server";

export const sendContactMessageFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(contactSchema)
  .handler(({ data }) => sendContactMessage(data));
