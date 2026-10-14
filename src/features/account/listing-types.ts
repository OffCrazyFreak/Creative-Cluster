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

export type SaveListingResult =
  { status: "saved"; changed: boolean } | { status: "pending_review" };

// Start's serialization check rejects the open `attrs` type of rich text nodes, although the stored JSON
// is plain. The server function returns this opaque shape and the query casts it back.
export type OwnListingWire = Omit<IOwnListing, "values"> & {
  values: Record<string, never>;
};
