import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool as PgPool } from "pg";

import { env } from "@/env.server";

import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

// Neon's WebSocket pool in production (transactions work over it), plain pg locally.
function createDb(): Db {
  if (env.DATABASE_DRIVER === "neon") {
    const pool = new NeonPool({ connectionString: env.DATABASE_URL });
    return drizzleNeon({ client: pool, schema, casing: "snake_case" });
  }
  const pool = new PgPool({ connectionString: env.DATABASE_URL, max: 5 });
  return drizzlePg({ client: pool, schema, casing: "snake_case" });
}

export const db = createDb();
