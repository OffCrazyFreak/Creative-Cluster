import { z } from "zod";

import { LOCALES } from "@/constants/locales";
import {
  MAX_TAGS_PER_FIELD,
  TAG_FIELDS,
  type TagField,
  type TagStatus,
} from "@/constants/tags";

import type { ITagText } from "./tag-label";

export interface ITagOption extends ITagText {
  id: string;
  slug: string;
  parentId: string | null;
  status: TagStatus;
}

export type IEntryTags = Record<TagField, ITagOption[]>;

const labelSchema = z.string().trim().min(2).max(60);
// Merges carry aliases over, so the cap here is also the cap there.
export const MAX_TAG_ALIASES = 20;
const aliasesSchema = z
  .array(z.string().trim().min(1).max(60))
  .max(MAX_TAG_ALIASES);

export const entryTagsInput = z.object({ entryId: z.uuid() });

export const suggestTagInput = z.object({
  label: labelSchema,
  locale: z.enum(LOCALES),
});

export const saveEntryTagsInput = z.object({
  entryId: z.uuid(),
  field: z.enum(TAG_FIELDS),
  tagIds: z.array(z.uuid()).max(MAX_TAGS_PER_FIELD),
});

export const updateTagInput = z.object({
  tagId: z.uuid(),
  labelEn: labelSchema,
  labelHr: labelSchema,
  aliasesEn: aliasesSchema,
  aliasesHr: aliasesSchema,
});

export const decideSuggestionInput = z.object({
  tagId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
});

export const mergeTagsInput = z.object({
  sourceId: z.uuid(),
  targetId: z.uuid(),
});

export interface IAdminTagRow extends ITagOption {
  sourceUri: string | null;
  canonicalId: string | null;
  suggestedByName: string | null;
  usage: number;
  createdAt: Date;
}
