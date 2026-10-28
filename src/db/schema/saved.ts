import { index, integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { createdAt } from "../columns";
import { user } from "./auth";
import { entry } from "./entries";

// A member's saved entries; deleting the account or the entry removes the row.
export const savedEntry = pgTable(
  "saved_entry",
  {
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entryId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.entryId] }),
    index().on(t.entryId),
  ],
);
