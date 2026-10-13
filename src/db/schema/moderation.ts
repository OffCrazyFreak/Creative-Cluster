import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  CHANGE_ACTIONS,
  CHANGE_SOURCES,
  MODERATED_ENTITIES,
  REASON_CODES,
  REVIEW_STATUSES,
  REVIEW_TYPES,
  type ChangeAction,
  type ChangeSource,
  type ModeratedEntity,
  type ReasonCode,
  type ReviewStatus,
  type ReviewType,
} from "@/constants/moderation";

import { createdAt, id, oneOf, timestamptz } from "../columns";
import { user } from "./auth";

export const reviewItem = pgTable(
  "review_item",
  {
    id: id(),
    type: text().$type<ReviewType>().notNull(),
    entityType: text().$type<ModeratedEntity>().notNull(),
    entityId: uuid().notNull(),
    status: text().$type<ReviewStatus>().notNull().default("open"),
    payload: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    reasonCode: text().$type<ReasonCode>(),
    noteToApplicant: text(),
    decidedBy: uuid().references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    decidedAt: timestamptz(),
  },
  (t) => [
    index().on(t.status, t.type, t.createdAt),
    index().on(t.entityType, t.entityId),
    index().on(t.decidedBy),
    check("review_item_entity_check", oneOf(t.entityType, MODERATED_ENTITIES)),
    check("review_item_type_check", oneOf(t.type, REVIEW_TYPES)),
    check("review_item_status_check", oneOf(t.status, REVIEW_STATUSES)),
    check("review_item_reason_check", oneOf(t.reasonCode, REASON_CODES)),
  ],
);

export const changeLog = pgTable(
  "change_log",
  {
    id: id(),
    entityType: text().$type<ModeratedEntity>().notNull(),
    entityId: uuid().notNull(),
    userId: uuid().references(() => user.id, { onDelete: "set null" }),
    source: text().$type<ChangeSource>().notNull(),
    action: text().$type<ChangeAction>().notNull(),
    changedFields: text().array().notNull().default([]),
    before: jsonb().$type<Record<string, unknown>>(),
    after: jsonb().$type<Record<string, unknown>>(),
    revertedByLogId: uuid().references((): AnyPgColumn => changeLog.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("change_log_entity_created_idx").on(
      t.entityType,
      t.entityId,
      sql`${t.createdAt} desc`,
    ),
    index().on(t.userId),
    check("change_log_entity_check", oneOf(t.entityType, MODERATED_ENTITIES)),
    check("change_log_source_check", oneOf(t.source, CHANGE_SOURCES)),
    check("change_log_action_check", oneOf(t.action, CHANGE_ACTIONS)),
  ],
);
