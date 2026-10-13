import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";

import { db } from "@/db/client.server";

// Uptime monitor target: a database round trip proves the app and Postgres are both up.
export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`select 1`);
          return new Response("ok", {
            headers: { "Cache-Control": "no-store" },
          });
        } catch {
          return new Response("database unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
