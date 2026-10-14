import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { IMAGE_ACCEPTED_TYPES, IMAGE_MAX_BYTES } from "@/constants/images";

import { bytea, createdAt, id, oneOf } from "../columns";

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
    contentHash: text().notNull().unique("image_content_hash_unique"),
    altText: text(),
    createdAt: createdAt(),
  },
  (t) => [
    check("image_mime_check", oneOf(t.mime, IMAGE_ACCEPTED_TYPES)),
    check(
      "image_size_check",
      sql`${t.size} = octet_length(${t.bytes}) and ${t.size} between 1 and ${sql.raw(String(IMAGE_MAX_BYTES))}`,
    ),
  ],
);
