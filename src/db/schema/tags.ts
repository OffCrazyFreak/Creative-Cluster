import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  uuid,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import {
  TAG_FIELDS,
  TAG_STATUSES,
  type TagField,
  type TagStatus,
} from "@/constants/tags";

import { createdAt, id, oneOf } from "../columns";
import { user } from "./auth";
import { entry } from "./entries";

export const tag = pgTable(
  "tag",
  {
    id: id(),
    slug: text().notNull(),
    labelEn: text().notNull(),
    labelHr: text().notNull(),
    aliasesEn: text().array().notNull().default([]),
    aliasesHr: text().array().notNull().default([]),
    parentId: uuid().references((): AnyPgColumn => tag.id, {
      onDelete: "set null",
    }),
    canonicalId: uuid().references((): AnyPgColumn => tag.id, {
      onDelete: "set null",
    }),
    sourceUri: text(),
    status: text().$type<TagStatus>().notNull().default("active"),
    suggestedBy: uuid().references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("tag_slug_lower_idx").on(sql`lower(${t.slug})`),
    index().on(t.parentId),
    index().on(t.canonicalId),
    index().on(t.suggestedBy),
    check("tag_status_check", oneOf(t.status, TAG_STATUSES)),
  ],
);

export const entryTag = pgTable(
  "entry_tag",
  {
    entryId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    field: text().$type<TagField>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.tagId, t.field] }),
    index().on(t.tagId, t.field),
    check("entry_tag_field_check", oneOf(t.field, TAG_FIELDS)),
  ],
);
