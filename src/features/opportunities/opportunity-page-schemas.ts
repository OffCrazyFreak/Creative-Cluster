import { z } from "zod";

import { LOCALES, type AppLocale } from "@/constants/locales";
import {
  OPPORTUNITY_REPORT_MESSAGE_MAX,
  type OpportunityCategory,
  type OpportunityType,
} from "@/constants/opportunities";
import type { SerializableDoc } from "@/features/translation/translation-fields";
import type { IImageRef } from "@/typings/images";

import type { IOpportunityTagRef } from "./opportunity-list-schemas";

export const opportunityPageInput = z.object({
  id: z.uuid(),
  locale: z.enum(LOCALES),
});

export const reportOpportunityInput = z.object({
  id: z.uuid(),
  message: z.string().trim().max(OPPORTUNITY_REPORT_MESSAGE_MAX),
  turnstileToken: z.string().min(1).max(4096),
  // Real visitors never see this field; a bot that fills it is dropped.
  fax: z.string().max(200).default(""),
});

// "ended" pages stay up with a banner for 30 days and are kept out of the index.
export type OpportunityPageState = "active" | "expired" | "filled";

export interface IOpportunityTranslation {
  title: string | null;
  body: SerializableDoc | null;
  bodyText: string | null;
  origin: "machine" | "human";
}

export interface IOpportunityPage {
  id: string;
  state: OpportunityPageState;
  type: OpportunityType;
  category: OpportunityCategory;
  title: string;
  body: SerializableDoc;
  bodyText: string;
  sourceLocale: string;
  remoteOk: boolean;
  deadline: string | null;
  expiresAt: string;
  entry: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    logo: IImageRef | null;
    // Same rule as the entry page: the relay form exists only for a working contact address.
    hasContactChannel: boolean;
  };
  tags: IOpportunityTagRef[];
  // Only when the reader's language differs from the owner's and a translation is stored.
  translation: IOpportunityTranslation | null;
  // True when the reader's language differs but no translation exists yet.
  translationMissing: boolean;
  // Languages whose page is indexable (the owner's and each stored translation), for hreflang.
  indexedLocales: AppLocale[];
}

export type OpportunityPageResult =
  | { status: "found"; opportunity: IOpportunityPage }
  | { status: "gone" }
  | { status: "missing" };
