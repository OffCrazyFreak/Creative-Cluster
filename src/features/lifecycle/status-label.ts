import type { EntryStatus } from "@/constants/entry";
import { m } from "@/paraglide/messages";

const LABELS: Record<EntryStatus, () => string> = {
  draft: () => m.lifecycle_status_draft(),
  pending: () => m.lifecycle_status_pending(),
  published: () => m.lifecycle_status_published(),
  suspended: () => m.lifecycle_status_suspended(),
  rejected: () => m.lifecycle_status_rejected(),
  archived: () => m.lifecycle_status_archived(),
};

export function statusLabel(status: EntryStatus): string {
  return LABELS[status]();
}
