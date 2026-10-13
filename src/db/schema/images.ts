import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { bytea, createdAt, id } from "../columns";

export const IMAGE_MAX_BYTES = 1_000_000;

// Never select `bytes` in list queries; only the /img route reads it.
export const image = pgTable(
  "image",
  {
    id: id(),
    bytes: bytea().notNull(),
    mime: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    size: integer().notNull(),
    contentHash: text().notNull().unique(),
    altText: text(),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "image_size_check",
      sql`${t.size} > 0 and ${t.size} <= ${sql.raw(String(IMAGE_MAX_BYTES))}`,
    ),
  ],
);
