import type { AppLocale } from "@/constants/locales";
import type { EntryKind, EntryStatus } from "@/constants/entry";

import type { ListingFormValues } from "./listing-schemas";

// What /account needs about the owner's entry; dates are ISO strings so they cross the server boundary plainly.
export interface IOwnListing {
  id: string;
  slug: string;
  kind: EntryKind;
  status: EntryStatus;
  trusted: boolean;
  name: string;
  suspendedReason: string | null;
  publishedAt: string | null;
  updatedAt: string;
  lastConfirmedAt: string | null;
  hasPendingEdit: boolean;
  values: ListingFormValues;
}

// sourceLocale is the language detected on save, so the form can show what was stored.
export type SaveListingResult = { sourceLocale: AppLocale } & (
  { status: "saved"; changed: boolean } | { status: "pending_review" }
);

// Start's serialization check rejects the open `attrs` type of rich text nodes, although the stored JSON
// is plain. The server function returns this opaque shape and the query casts it back.
export type OwnListingWire = Omit<IOwnListing, "values"> & {
  values: Record<string, never>;
};

// The light version for /account: no form values, so the home page does not load the whole entry.
export interface IOwnSummary {
  id: string;
  slug: string;
  kind: EntryKind;
  status: EntryStatus;
  name: string;
  suspendedReason: string | null;
  updatedAt: string;
  lastConfirmedAt: string | null;
  hasPendingEdit: boolean;
  // Set once the owner asked to delete the listing and account; the lifecycle area owns the purge.
  erasureRequestedAt: string | null;
}
