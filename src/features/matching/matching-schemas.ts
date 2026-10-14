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

/** Whose point of view the reason lines are written from. */
export interface IMatchPerspective {
  entryName: string;
  /** True when the reader owns the entry whose page is shown. */
  viewerOwns: boolean;
}

export interface ICollaborationView
  extends ICollaborationResult, IMatchPerspective {}

export interface ICollaborationResult {
  /** "similar" is the topic-only fallback for entries with no offering or seeking tags. */
  mode: "collaborate" | "similar";
  cards: ICollaborationCard[];
}
