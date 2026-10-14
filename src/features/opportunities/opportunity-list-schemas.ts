import { z } from "zod";

import { LOCALES } from "@/constants/locales";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_TYPES,
} from "@/constants/opportunities";
import type { IImageRef } from "@/typings/images";

export const publicOpportunitiesInput = z.object({
  locale: z.enum(LOCALES),
  type: z.enum(OPPORTUNITY_TYPES).optional(),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional(),
  // Tag slugs; a post matches when it has any of them, like the map's tag filter.
  tags: z.array(z.string().min(1).max(80)).max(10).default([]),
  country: z
    .string()
    .regex(/^[a-zA-Z]{2}$/)
    .optional(),
  closing: z.boolean().default(false),
});
export type PublicOpportunitiesInput = z.input<typeof publicOpportunitiesInput>;

export interface IOpportunityTagRef {
  slug: string;
  labelEn: string;
  labelHr: string;
}

export interface IPublicOpportunity {
  id: string;
  type: (typeof OPPORTUNITY_TYPES)[number];
  category: (typeof OPPORTUNITY_CATEGORIES)[number];
  title: string;
  titleLang: string;
  snippet: string;
  snippetLang: string;
  remoteOk: boolean;
  deadline: string | null;
  expiresAt: string;
  // Closed as filled within the last week: still listed, with a label.
  filled: boolean;
  entry: {
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    logo: IImageRef | null;
  };
  tags: IOpportunityTagRef[];
}

export interface IPublicOpportunities {
  items: IPublicOpportunity[];
  // Options for the filters, from every active post, so choosing one never empties the choices.
  facets: { countries: string[]; tags: IOpportunityTagRef[] };
}
