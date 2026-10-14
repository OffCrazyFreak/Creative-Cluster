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

export type OpResult<E extends string> = { ok: true } | { ok: false; error: E };

export const entryIdSchema = z.object({ id: z.uuid() });

export const transferOwnerSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
});
export type TransferError = "owner_has_entry" | "not_found" | "blocked";

export const mergeSchema = z.object({
  stubId: z.uuid(),
  targetId: z.uuid(),
});
export type MergeError = "not_found" | "not_a_stub" | "bad_target";

export const movePinSchema = z.object({
  id: z.uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type MovePinError = "not_found" | "person";

export const changeSlugSchema = z.object({
  id: z.uuid(),
  slug: z.string().trim().min(1).max(80),
});
export type SlugError = "taken" | "invalid" | "not_found";

export const searchSchema = z.object({ q: z.string().trim().min(2).max(100) });

export interface IUserHit {
  id: string;
  name: string;
  email: string;
}

export interface IEntryHit {
  id: string;
  name: string;
  slug: string;
  status: EntryStatus;
}

export type DetailFieldType = "text" | "date" | "bool" | "json";

export interface IDetailField {
  key: string;
  type: DetailFieldType;
  value: string | null;
}

export interface IStatusChange {
  id: string;
  createdAt: string;
  actor: string | null;
  source: string;
  from: string | null;
  to: string | null;
  reason: string | null;
}

export interface IOpenReview {
  id: string;
  type: string;
  createdAt: string;
}

export interface IAdminEntryDetail {
  id: string;
  name: string;
  kind: EntryKind;
  status: EntryStatus;
  slug: string;
  lat: number | null;
  lng: number | null;
  countryCode: string | null;
  fields: IDetailField[];
  history: IStatusChange[];
  reviews: IOpenReview[];
}
