import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  type OpportunityCategory,
  type OpportunityStatus,
  type OpportunityType,
} from "@/constants/opportunities";
import { LOCALES } from "@/constants/locales";
import type { RichTextDoc } from "@/typings/rich-text";

import { createdAt, id, oneOf, timestamptz, updatedAt } from "../columns";
import { entry } from "./entries";
import { tag } from "./tags";

export const opportunity = pgTable(
  "opportunity",
  {
    id: id(),
    entryId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    type: text().$type<OpportunityType>().notNull(),
    category: text().$type<OpportunityCategory>().notNull(),
    title: text().notNull(),
    body: jsonb().$type<RichTextDoc>().notNull(),
    bodyText: text().notNull().default(""),
    sourceLocale: text().notNull(),
    remoteOk: boolean().notNull().default(false),
    deadline: date({ mode: "string" }),
    expiresAt: timestamptz().notNull(),
    renewals: integer().notNull().default(0),
    status: text().$type<OpportunityStatus>().notNull().default("pending"),
    closedReason: text(),
    closedAt: timestamptz(),
    publishedAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.status, t.expiresAt),
    index().on(t.entryId),
    check("opportunity_source_locale_check", oneOf(t.sourceLocale, LOCALES)),
    check("opportunity_type_check", oneOf(t.type, OPPORTUNITY_TYPES)),
    check(
      "opportunity_category_check",
      oneOf(t.category, OPPORTUNITY_CATEGORIES),
    ),
    check("opportunity_status_check", oneOf(t.status, OPPORTUNITY_STATUSES)),
  ],
);

export const opportunityTag = pgTable(
  "opportunity_tag",
  {
    opportunityId: uuid()
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.opportunityId, t.tagId] }),
    index().on(t.tagId),
  ],
);
