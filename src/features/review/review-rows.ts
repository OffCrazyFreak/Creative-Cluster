import type { IReviewRow } from "./review-schemas";

// Taking a post down needs its own reason, so these reports are decided one at a time, never in a bulk run.
export function removesPost(row: Pick<IReviewRow, "type" | "entityType">) {
  return row.type === "report" && row.entityType === "opportunity";
}

// People are shown at town level only, so the service refuses a hand-placed pin for them. An unknown kind means the entry is gone.
export function canMovePin(row: Pick<IReviewRow, "type" | "kind">) {
  return (
    (row.type === "application" || row.type === "untrusted_edit") &&
    row.kind !== null &&
    row.kind !== "person"
  );
}
