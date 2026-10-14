import { z } from "zod";

import { LOCALES } from "@/constants/locales";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_LIMITS as L,
  OPPORTUNITY_TAG_MAX,
  OPPORTUNITY_TYPES,
  type OpportunityRuleCode,
} from "@/constants/opportunities";
import type { IParsedRichText } from "@/lib/rich-text/parse-rich-text";
import { richTextInput } from "@/lib/rich-text/rich-text-input";
import { m } from "@/paraglide/messages";
import type { IFormRichText } from "@/typings/rich-text";

function richText(max: number) {
  return richTextInput(max) as unknown as z.ZodType<
    IParsedRichText,
    IFormRichText
  >;
}

const title = z
  .string()
  .trim()
  .min(3, { error: () => m.opportunities_error_title() })
  .max(L.titleLength, { error: () => m.opportunities_error_title() });

// Empty means "no deadline"; the date input yields YYYY-MM-DD.
const deadline = z
  .string()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    error: () => m.opportunities_error_deadline(),
  });

export const opportunityValuesSchema = z.object({
  type: z.enum(OPPORTUNITY_TYPES),
  category: z.enum(OPPORTUNITY_CATEGORIES),
  title,
  body: richText(L.bodyLength).refine((parsed) => parsed.text.length > 0, {
    error: () => m.opportunities_error_body(),
  }),
  sourceLocale: z.enum(LOCALES),
  remoteOk: z.boolean(),
  deadline,
  tagIds: z.array(z.uuid()).max(OPPORTUNITY_TAG_MAX),
});

export type OpportunityFormValues = z.input<typeof opportunityValuesSchema>;
export type OpportunityInput = z.output<typeof opportunityValuesSchema>;

export const createOpportunityInput = z.object({
  entryId: z.uuid(),
  values: opportunityValuesSchema,
});

export const updateOpportunityInput = z.object({
  id: z.uuid(),
  values: opportunityValuesSchema,
});

export const opportunityIdInput = z.object({ id: z.uuid() });

export const renewOpportunityInput = z.object({
  id: z.uuid(),
  // Only needed when the post has a deadline: the new one must reach past the old end.
  deadline: deadline.optional(),
});

type FieldIssues = Record<string, { message: string }[]>;

export function validateOpportunity({
  value,
}: {
  value: OpportunityFormValues;
}) {
  const result = opportunityValuesSchema.safeParse(value);
  if (result.success) return undefined;
  const fields: FieldIssues = {};
  for (const issue of result.error.issues) {
    (fields[issue.path.join(".")] ??= []).push({ message: issue.message });
  }
  return { fields };
}

export type OpportunityResult =
  | { status: "published" | "pending_review" | "saved" }
  | { status: "refused"; code: OpportunityRuleCode };
