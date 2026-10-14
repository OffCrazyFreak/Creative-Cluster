import { z } from "zod";

import { LINK_KINDS, type LinkKind, type LinkStatus } from "@/constants/links";
import { isHttpUrl, normalizeHttpUrl } from "@/utils/http-url";

export const LINK_DIRECTIONS = ["outgoing", "incoming"] as const;
export type LinkDirection = (typeof LINK_DIRECTIONS)[number];

export const LINK_YEAR_RANGE = { min: 1900, max: 2100 } as const;
export const LINK_URL_MAX_LENGTH = 300;

const httpUrl = z
  .string()
  .trim()
  .max(LINK_URL_MAX_LENGTH)
  .transform((value) => normalizeHttpUrl(value) ?? value)
  .refine(isHttpUrl);

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

const year = z
  .number()
  .int()
  .min(LINK_YEAR_RANGE.min)
  .max(LINK_YEAR_RANGE.max)
  .nullable()
  .default(null);

const target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("entry"), entryId: z.uuid() }),
  z.object({
    type: z.literal("outside"),
    name: z.string().trim().min(2).max(120),
    website: httpUrl,
  }),
]);

export const proposeLinkInput = z
  .object({
    fromEntryId: z.uuid(),
    target,
    kind: z.enum(LINK_KINDS),
    direction: z.enum(LINK_DIRECTIONS).default("outgoing"),
    year,
    endYear: year,
    project: optionalText(120),
    note: optionalText(500),
    // An empty field means "no evidence", not an invalid address.
    evidenceUrl: z.preprocess(
      (value) => (value === "" ? null : value),
      httpUrl.nullable().default(null),
    ),
  })
  // Links to outside partners are never confirmed by the other side, so the proof is the evidence.
  .refine((v) => v.target.type !== "outside" || v.evidenceUrl !== null, {
    path: ["evidenceUrl"],
    message: "evidence_required",
  })
  .refine(
    (v) => v.endYear === null || (v.year !== null && v.endYear >= v.year),
    {
      path: ["endYear"],
      message: "end_year_invalid",
    },
  );
export type ProposeLinkInput = z.infer<typeof proposeLinkInput>;

export const linkIdInput = z.object({ linkId: z.uuid() });

export const decideLinkInput = linkIdInput.extend({
  decision: z.enum(["confirm", "reject"]),
});
export type DecideLinkInput = z.infer<typeof decideLinkInput>;

export const searchTargetsInput = z.object({
  query: z.string().trim().min(2).max(80),
});

export type ProposeError =
  "target_unavailable" | "exists" | "cooldown" | "limit";
export type ProposeLinkResult =
  { ok: true; linkId: string } | { ok: false; error: ProposeError };

export interface ILinkEntryRef {
  id: string;
  name: string;
  slug: string;
  kind: "organization" | "person" | "outside_partner";
  website: string | null;
  // No owner account yet: a proposal waits until the listing is claimed.
  unclaimed: boolean;
}

export interface IConnectionItem {
  id: string;
  kind: LinkKind;
  status: LinkStatus;
  year: number | null;
  endYear: number | null;
  project: string | null;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  evidence: string[];
  // Which side the viewer's entry is on: "outgoing" means the viewer's entry is the from end.
  direction: LinkDirection;
  role: "proposer" | "recipient";
  self: ILinkEntryRef;
  other: ILinkEntryRef;
}

export interface IMyConnections {
  entries: { id: string; name: string }[];
  items: IConnectionItem[];
}

export interface ILinkTarget {
  id: string;
  name: string;
  city: string | null;
  countryCode: string | null;
}

export const publicConnectionsInput = z.object({ entryId: z.uuid() });

export interface IPublicRelation {
  kind: LinkKind;
  // From the page entry's point of view: "outgoing" means the page entry is the from end.
  direction: LinkDirection;
  year: number | null;
  endYear: number | null;
  project: string | null;
}

export interface IPublicPartner extends IPublicRelation {
  linkId: string;
  entryId: string;
  slug: string;
  name: string;
  city: string | null;
  countryCode: string | null;
}

// Outside partners nobody confirmed: shown on the proposer's page only, with their evidence.
export interface IUnverifiedPartner extends IPublicRelation {
  linkId: string;
  name: string;
  website: string | null;
  evidence: string[];
}

export interface IGraphNode {
  id: string;
  label: string;
  slug: string | null;
  x: number;
  y: number;
}

export interface IGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface IConnectionGraph {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  width: number;
  height: number;
  // Partners that did not fit; the list shows every one.
  more: number;
}

export interface IPublicConnections {
  partners: IPublicPartner[];
  unverified: IUnverifiedPartner[];
  graph: IConnectionGraph | null;
}
