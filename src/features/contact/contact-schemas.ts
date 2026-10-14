import { find } from "linkifyjs";
import { z } from "zod";

import {
  CONTACT_MAX_LINKS,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
} from "@/constants/contact";
import type { EntryKind } from "@/constants/entry";
import { LOCALES } from "@/constants/locales";

export function countLinks(text: string): number {
  return find(text).filter((item) => item.type === "url").length;
}

export const contactMessageSchema = z
  .string()
  .trim()
  .min(1)
  .max(CONTACT_MESSAGE_MAX)
  .refine((text) => countLinks(text) <= CONTACT_MAX_LINKS);

// The form schema without the bot checks, so the browser validates the same rules the server enforces.
export const contactFieldsSchema = z.object({
  name: z.string().trim().min(1).max(CONTACT_NAME_MAX),
  email: z.email().max(254),
  message: contactMessageSchema,
});

export const contactSchema = contactFieldsSchema.extend({
  entryId: z.uuid(),
  locale: z.enum(LOCALES),
  turnstileToken: z.string().min(1).max(4096),
  // Honeypot: real visitors never see or fill this field.
  fax: z.string().max(200),
  // Epoch ms when the form opened, for the minimum fill time.
  startedAt: z.number().int(),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactResult =
  | { status: "sent"; kind: EntryKind | null }
  | { status: "captcha" | "limited" };
