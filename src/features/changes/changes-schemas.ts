import { z } from "zod";

import {
  CHANGE_ACTIONS,
  CHANGE_SOURCES,
  MODERATED_ENTITIES,
} from "@/constants/moderation";
import { REVERT_REASON_MAX } from "@/constants/review";

export const changesListSchema = z.object({
  entityType: z.enum(MODERATED_ENTITIES).optional(),
  source: z.enum(CHANGE_SOURCES).optional(),
  action: z.enum(CHANGE_ACTIONS).optional(),
  entityId: z.uuid().optional(),
  page: z.number().int().min(1).default(1),
});

export const changeIdSchema = z.object({ id: z.uuid() });

export const revertChangeSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(1).max(REVERT_REASON_MAX),
});

export type ChangesListInput = z.infer<typeof changesListSchema>;

export interface IChangeRow {
  id: string;
  createdAt: string;
  entityType: (typeof MODERATED_ENTITIES)[number];
  entityId: string;
  label: string;
  actor: string | null;
  source: (typeof CHANGE_SOURCES)[number];
  action: (typeof CHANGE_ACTIONS)[number];
  changedFields: string[];
  reverted: boolean;
}

export interface IChangesPage {
  rows: IChangeRow[];
  total: number;
  pageSize: number;
}

// Values travel as JSON text so the diff never depends on how a field is typed.
export interface IFieldDiff {
  field: string;
  before: string;
  current: string;
  restorable: boolean;
}

export interface IChangeDetail {
  row: IChangeRow;
  revertible: boolean;
  diffs: IFieldDiff[];
}

export type RevertResult =
  { status: "ok" } | { status: "not_revertible" } | { status: "failed" };
