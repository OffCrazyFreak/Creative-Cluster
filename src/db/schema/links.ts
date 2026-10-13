import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  LINK_KINDS,
  LINK_STATUSES,
  SYMMETRIC_LINK_KINDS,
  type LinkKind,
  type LinkStatus,
} from "@/constants/links";

import { createdAt, id, oneOf, timestamptz, updatedAt } from "../columns";
import { user } from "./auth";
import { entry } from "./entries";

export const link = pgTable(
  "link",
  {
    id: id(),
    fromId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    toId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    kind: text().$type<LinkKind>().notNull(),
    symmetric: boolean().notNull(),
    status: text().$type<LinkStatus>().notNull().default("proposed"),
    year: integer(),
    endYear: integer(),
    project: text(),
    note: text(),
    proposedBy: uuid().references(() => user.id, { onDelete: "set null" }),
    proposedByEntryId: uuid().references(() => entry.id, {
      onDelete: "cascade",
    }),
    decidedBy: uuid().references(() => user.id, { onDelete: "set null" }),
    decidedAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Rejected and withdrawn rows stay as history, so only live links are unique.
    uniqueIndex("link_live_unique")
      .on(t.fromId, t.toId, t.kind)
      .where(sql`${t.status} in ('proposed', 'confirmed')`),
    index().on(t.proposedBy),
    index().on(t.proposedByEntryId),
    index().on(t.decidedBy),
    index().on(t.fromId),
    index().on(t.toId),
    check("link_not_self_check", sql`${t.fromId} <> ${t.toId}`),
    check(
      "link_symmetric_order_check",
      sql`not ${t.symmetric} or ${t.fromId} < ${t.toId}`,
    ),
    check("link_kind_check", oneOf(t.kind, LINK_KINDS)),
    check(
      "link_symmetric_kind_check",
      sql`${t.symmetric} = (${oneOf(t.kind, SYMMETRIC_LINK_KINDS)})`,
    ),
    check("link_status_check", oneOf(t.status, LINK_STATUSES)),
  ],
);

export const linkEvidence = pgTable(
  "link_evidence",
  {
    id: id(),
    linkId: uuid()
      .notNull()
      .references(() => link.id, { onDelete: "cascade" }),
    url: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.linkId)],
);
