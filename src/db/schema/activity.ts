import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, id } from "../columns";
import { entry } from "./entries";

export const entryViewDay = pgTable(
  "entry_view_day",
  {
    entryId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    day: date({ mode: "string" }).notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.day] })],
);

// Message bodies are never stored; rows only feed the per-sender limits and expire after 30 days.
export const contactMessage = pgTable(
  "contact_message",
  {
    id: id(),
    entryId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    senderHash: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.senderHash, t.createdAt),
    index().on(t.entryId, t.createdAt),
  ],
);

// Fixed-window counters for limits that better-auth does not cover (apply, contact, geocoding).
export const usageCounter = pgTable("usage_counter", {
  key: text().primaryKey(),
  windowStart: createdAt(),
  count: integer().notNull().default(0),
});
