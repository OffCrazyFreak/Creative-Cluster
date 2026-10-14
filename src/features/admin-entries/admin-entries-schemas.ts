import { z } from "zod";

import { ENTRY_KINDS, ENTRY_STATUSES } from "@/constants/entry";
import { LOCATION_COUNTRIES } from "@/constants/countries";
import type { EntryKind, EntryStatus } from "@/constants/entry";

export const ADMIN_ENTRIES_PAGE_SIZE = 25;

// Every filter falls back to "off" on a bad URL value, so a hand-edited link never breaks the page.
export const adminEntriesSearchSchema = z.object({
  status: z.enum(ENTRY_STATUSES).optional().catch(undefined),
  kind: z.enum(ENTRY_KINDS).optional().catch(undefined),
  country: z.enum(LOCATION_COUNTRIES).optional().catch(undefined),
  trusted: z.enum(["yes", "no"]).optional().catch(undefined),
  stale: z.literal(true).optional().catch(undefined),
  unclaimed: z.literal(true).optional().catch(undefined),
  emailInvalid: z.literal(true).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.number().int().min(1).default(1).catch(1),
});

export type AdminEntriesSearch = z.infer<typeof adminEntriesSearchSchema>;

export interface IAdminEntryRow {
  id: string;
  name: string;
  slug: string;
  kind: EntryKind;
  status: EntryStatus;
  trusted: boolean;
  countryCode: string | null;
  ownerEmail: string | null;
  lastConfirmedAt: string | null;
  importedAt: string | null;
  contactEmailInvalid: boolean;
}

export interface IAdminEntriesPage {
  rows: IAdminEntryRow[];
  total: number;
  pageSize: number;
}
