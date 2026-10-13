import { z } from "zod";

export const collaborationInput = z.object({ entryId: z.uuid() });

export type MatchRelation = "offers" | "seeks" | "topic";

export interface IMatchTag {
  slug: string;
  labelEn: string;
  labelHr: string;
}

export interface IMatchReason {
  relation: MatchRelation;
  tags: IMatchTag[];
}

export interface ICollaborationCard {
  entryId: string;
  slug: string;
  name: string;
  city: string | null;
  countryCode: string | null;
  /** null for "similar" cards, which carry no strength label. */
  strength: "strong" | "possible" | null;
  reasons: IMatchReason[];
}

export interface ICollaborationResult {
  /** "similar" is the topic-only fallback for entries with no offering or seeking tags. */
  mode: "collaborate" | "similar";
  cards: ICollaborationCard[];
}
