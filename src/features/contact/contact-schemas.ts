import { find } from "linkifyjs";
import { z } from "zod";

import {
  CONTACT_MAX_LINKS,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
} from "@/constants/contact";
import type { EntryKind } from "@/constants/entry";
import { LOCALES } from "@/constants/locales";
import { m } from "@/paraglide/messages";

export function countLinks(text: string): number {
  return find(text).filter((item) => item.type === "url").length;
}

export const contactMessageSchema = z
  .string()
  .trim()
  .min(1, { error: () => m.contact_error_message_empty() })
  .max(CONTACT_MESSAGE_MAX, { error: () => m.contact_error_message_long() })
  .refine((text) => countLinks(text) <= CONTACT_MAX_LINKS, {
    error: () => m.contact_error_message_links(),
  });

// The form schema without the bot checks, so the browser validates the same rules the server enforces.
export const contactFieldsSchema = z.object({
  // One line without links: the name sits outside the escaped message block in the mail.
  name: z
    .string()
    .trim()
    .min(1, { error: () => m.contact_error_name() })
    .max(CONTACT_NAME_MAX, { error: () => m.contact_error_name() })
    .refine((text) => countLinks(text) === 0, {
      error: () => m.contact_error_name_links(),
    })
    .transform((text) => text.replace(/\s+/g, " ")),
  email: z
    .email({ error: () => m.contact_error_email() })
    .max(254, { error: () => m.contact_error_email() }),
  message: contactMessageSchema,
});

export const contactSchema = contactFieldsSchema.extend({
  entryId: z.uuid(),
  locale: z.enum(LOCALES),
  turnstileToken: z.string().min(1).max(4096),
  // Honeypot: real visitors never see or fill this field.
  fax: z.string().max(200),
  // Milliseconds the form was open, measured in the browser so a wrong clock cannot skew it.
  filledMs: z.number().int().min(0),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactResult =
  | { status: "sent"; kind: EntryKind | null }
  | { status: "captcha" }
  | { status: "limited" }
  | { status: "unavailable" };
