import type { EntryKind } from "@/constants/entry";
import { site } from "@/sites";

// Legal status is a Creative Cluster field and applies to organisations and partners, not people.
export function hasLegalStatus(kind: EntryKind): boolean {
  return site.id === "rpcc" && kind !== "person";
}
