import { z } from "zod";

import type { EntryKind, EntryStatus } from "@/constants/entry";
import { REVERT_REASON_MAX } from "@/constants/review";

export const entryIdSchema = z.object({ id: z.uuid() });

export const suspendSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(1).max(REVERT_REASON_MAX),
});

export const trustedSchema = z.object({ id: z.uuid(), trusted: z.boolean() });

export const unarchiveSchema = z.object({ consent: z.boolean() });

export interface IOwnListingStatus {
  id: string;
  name: string;
  slug: string;
  kind: EntryKind;
  status: EntryStatus;
  suspendedReason: string | null;
  lastConfirmedAt: string | null;
  hasConsent: boolean;
  erasureRequestedAt: string | null;
}

export type OwnerActionResult =
  { status: "ok" } | { status: "consent_required" };

export interface IAdminEntry {
  id: string;
  name: string;
  slug: string;
  kind: EntryKind;
  status: EntryStatus;
  trusted: boolean;
  suspendedReason: string | null;
  lastConfirmedAt: string | null;
  importedAt: string | null;
  erasureRequestedAt: string | null;
  ownerEmail: string | null;
}
