import { z } from "zod";

import { LINK_KINDS, type LinkKind } from "@/constants/links";

import type { ILinkEntryRef } from "./connections-schemas";

export const ADMIN_LINKS_PAGE_SIZE = 25;

// Every filter falls back to "off" on a bad URL value, so a hand-edited link never breaks the page.
export const adminLinksSearchSchema = z.object({
  kind: z.enum(LINK_KINDS).optional().catch(undefined),
  // Only proposals whose recipient has no owner yet: the ones an admin can decide.
  unclaimed: z.literal(true).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.number().int().min(1).max(100_000).default(1).catch(1),
});

export type AdminLinksSearch = z.infer<typeof adminLinksSearchSchema>;

export interface IAdminLinkRow {
  id: string;
  kind: LinkKind;
  createdAt: string;
  expiresAt: string;
  proposer: ILinkEntryRef;
  recipient: ILinkEntryRef;
  // "outgoing" when the proposer is the from end, as relationLabel expects.
  direction: "outgoing" | "incoming";
  // The recipient has no owner and the admin did not propose the link: confirm or reject is allowed.
  canDecide: boolean;
}

export interface IAdminLinksPage {
  rows: IAdminLinkRow[];
  total: number;
  pageSize: number;
}
