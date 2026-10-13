import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
} from "drizzle-orm/pg-core";

import { createdAt } from "../columns";

export const geocodeCache = pgTable("geocode_cache", {
  key: text().primaryKey(),
  provider: text().notNull(),
  hits: jsonb().$type<unknown[]>().notNull(),
  createdAt: createdAt(),
});

// DGU open address data for Croatia, replaced monthly in one transaction.
export const hrStreet = pgTable(
  "hr_street",
  {
    id: integer().primaryKey(),
    name: text().notNull(),
    settlement: text().notNull(),
    postcode: text().notNull(),
    searchText: text().notNull(),
  },
  (t) => [
    index("hr_street_search_trgm_idx").using(
      "gin",
      sql`${t.searchText} gin_trgm_ops`,
    ),
  ],
);

export const hrAddress = pgTable(
  "hr_address",
  {
    streetId: integer()
      .notNull()
      .references(() => hrStreet.id, { onDelete: "cascade" }),
    houseNumber: integer().notNull(),
    suffix: text().notNull().default(""),
    lon: real().notNull(),
    lat: real().notNull(),
  },
  (t) => [primaryKey({ columns: [t.streetId, t.houseNumber, t.suffix] })],
);
