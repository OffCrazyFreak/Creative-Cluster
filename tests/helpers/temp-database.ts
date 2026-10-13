import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import * as schema from "@/db/schema";

config({ path: ".env.local", quiet: true });

export interface ITempDatabase {
  url: string;
  db: ReturnType<typeof connect>;
  drop: () => Promise<void>;
}

function connect(pool: Pool) {
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

// A throwaway database next to the configured one, migrated from ./drizzle, so tests never touch real data.
// Returns null when no server is reachable, so the suite skips instead of failing on a bare machine.
export async function createTempDatabase(
  label: string,
): Promise<ITempDatabase | null> {
  const base = process.env.DATABASE_URL;
  if (!base) return null;
  const admin = new Pool({ connectionString: base, max: 1 });
  const name = `cc_test_${label}_${process.pid}_${Date.now()}`;
  try {
    await admin.query(`create database "${name}"`);
  } catch {
    await admin.end().catch(() => undefined);
    return null;
  }
  const url = new URL(base);
  url.pathname = `/${name}`;
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  // Dropping the database can kill idle pooled clients; that is expected at teardown.
  pool.on("error", () => undefined);
  const db = connect(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  return {
    url: url.toString(),
    db,
    async drop() {
      await pool.end();
      await admin.query(`drop database "${name}" with (force)`);
      await admin.end();
    },
  };
}
