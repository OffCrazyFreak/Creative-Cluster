import { sql, type SQL } from "drizzle-orm";
import {
  customType,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export function id() {
  return uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());
}

export function createdAt() {
  return timestamp({ withTimezone: true }).notNull().defaultNow();
}

export function updatedAt() {
  return timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
}

export function timestamptz() {
  return timestamp({ withTimezone: true });
}

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

// Enums are text + CHECK so adding a value is an additive migration, never a type rewrite.
export function oneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  const list = values.map((value) => `'${value.replaceAll("'", "''")}'`);
  return sql`${column} in (${sql.raw(list.join(", "))})`;
}
