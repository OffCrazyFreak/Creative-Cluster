import { inArray, sql } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";
import { entry } from "@/db/schema";
import { site } from "@/sites";

import type { StagingFile } from "./import-schemas";

// legacyId must be unique per site across every source file: it is the only idempotency key.
export async function existingLegacyIds(
  tx: DbOrTx,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await tx
    .select({ legacyId: sql<string>`${entry.extra}->>'legacy_id'` })
    .from(entry)
    .where(inArray(sql`${entry.extra}->>'legacy_id'`, ids));
  return new Set(rows.map((row) => row.legacyId));
}

export function assertStagingSite(file: StagingFile) {
  if (file.site !== site.id)
    throw new Error(
      `Staging file is for ${file.site}, this site is ${site.id}`,
    );
}
