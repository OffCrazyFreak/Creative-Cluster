import type { EntryStatus } from "@/constants/entry";
import type {
  OpportunityCategory,
  OpportunityType,
} from "@/constants/opportunities";

import type { OpportunityFormValues } from "./opportunity-schemas";

export type OwnOpportunityState =
  | "pending"
  | "active"
  | "expiring_soon"
  | "expired"
  | "filled"
  | "rejected"
  | "removed";

// Dates are ISO strings so they cross the server boundary plainly.
export interface IOwnOpportunity {
  id: string;
  title: string;
  type: OpportunityType;
  category: OpportunityCategory;
  state: OwnOpportunityState;
  deadline: string | null;
  expiresAt: string;
  renewals: number;
  canRenew: boolean;
  // The reason code of a rejection or removal; the full statement went out by email.
  reasonCode: string | null;
  values: OpportunityFormValues;
}

export interface IOwnOpportunities {
  entry: { id: string; name: string; status: EntryStatus } | null;
  // Posts that count toward the per-entry cap, and how many more fit today.
  openCount: number;
  canPost: boolean;
  // Whether the owner's next post waits for an admin (first post, or the entry is set to review).
  nextPostReviewed: boolean;
  items: IOwnOpportunity[];
}

// Start's serialization check rejects the open `attrs` type of rich text nodes, although the stored JSON
// is plain. The server function returns this opaque shape and the query casts it back.
export type OwnOpportunitiesWire = Omit<IOwnOpportunities, "items"> & {
  items: (Omit<IOwnOpportunity, "values"> & {
    values: Record<string, never>;
  })[];
};
