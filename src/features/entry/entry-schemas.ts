import { z } from "zod";

import type { EntryKind } from "@/constants/entry";
import type { TagField } from "@/constants/tags";
import type { IPublicImage } from "@/typings/images";
import type { JsonRichTextDoc } from "@/typings/rich-text";

export const slugInputSchema = z.object({ slug: z.string().min(1).max(120) });

export interface ITagRef {
  id: string;
  slug: string;
  labelEn: string;
  labelHr: string;
  field: TagField;
}

export interface IPublicLocation {
  onlineOnly: boolean;
  city: string | null;
  countryCode: string | null;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  townOnly: boolean;
}

// What a visitor may see of an entry: contact fields are already redacted for the viewer.
export interface IPublicEntry {
  id: string;
  slug: string;
  kind: EntryKind;
  name: string;
  sourceLocale: string;
  // Rich text as stored; null for entries written before the editor, which fall back to descriptionText.
  description: JsonRichTextDoc | null;
  descriptionText: string;
  offeringText: string;
  seekingText: string;
  website: string | null;
  socials: Record<string, string>;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  hasContactChannel: boolean;
  legalStatus: string | null;
  location: IPublicLocation;
  tags: ITagRef[];
  logo: IPublicImage | null;
  cover: IPublicImage | null;
  publishedAt: string | null;
  updatedAt: string;
  lastConfirmedAt: string | null;
}

export type EntryPageResult =
  | { status: "found"; entry: IPublicEntry }
  | { status: "redirect"; slug: string }
  | { status: "gone" }
  | { status: "missing" };
