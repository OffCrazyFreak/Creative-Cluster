import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, entryTag, tag } from "@/db/schema";
import { allocateSlug } from "@/features/entry/slug.server";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
import { site } from "@/sites";

import { entryValuesOf } from "./import-entry-values";
import type { StagingFile } from "./import-schemas";

export interface IImportResult {
  created: number;
  skipped: number;
}

// Held for the whole run so two imports of the same file cannot both see an organization as new.
const IMPORT_LOCK_KEY = 7_315_001;

// Idempotent by extra.legacy_id: an organization that is already in is left alone, so later edits survive a rerun.
export async function runImport(file: StagingFile): Promise<IImportResult> {
  if (file.site !== site.id)
    throw new Error(
      `Staging file is for ${file.site}, this site is ${site.id}`,
    );

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${IMPORT_LOCK_KEY})`);
    const wanted = [...new Set(file.organizations.flatMap((o) => o.topics))];
    const tagRows = wanted.length
      ? await tx
          .select({ id: tag.id, slug: tag.slug })
          .from(tag)
          .where(and(inArray(tag.slug, wanted), isNull(tag.canonicalId)))
      : [];
    const tagId = new Map(tagRows.map((row) => [row.slug, row.id]));
    const now = new Date();
    let created = 0;
    let skipped = 0;

    for (const org of file.organizations) {
      const [existing] = await tx
        .select({ id: entry.id })
        .from(entry)
        .where(sql`${entry.extra}->>'legacy_id' = ${org.legacyId}`)
        .limit(1);
      if (existing) {
        skipped += 1;
        continue;
      }
      const values = entryValuesOf(org, {
        locale: site.baseLocale,
        source: file.source,
        now,
      });
      const slug = await allocateSlug(tx, org.name);
      const [row] = await tx
        .insert(entry)
        .values({ ...values, slug })
        .returning({ id: entry.id });
      const links = org.topics.flatMap((topic) => {
        const id = tagId.get(topic);
        return id
          ? [{ entryId: row.id, tagId: id, field: "topic" as const }]
          : [];
      });
      if (links.length) await tx.insert(entryTag).values(links);
      // Contact data stays out of the log: the log is readable by every admin and kept long.
      await writeChange(tx, {
        entityType: "entry",
        entityId: row.id,
        userId: null,
        source: "import",
        action: "create",
        after: {
          name: org.name,
          status: "published",
          slug,
          legacyId: org.legacyId,
        },
      });
      await enqueueTranslation(tx, { entityType: "entry", entityId: row.id });
      created += 1;
    }
    return { created, skipped };
  });
  if (result.created > 0) invalidateMapDirectory();
  return result;
}

export interface IUnpinnedImport {
  id: string;
  slug: string;
  name: string;
  addressText: string | null;
  precision: string | null;
}

// Imported listings whose pin is missing or only town level: the admin fixes these by hand.
export async function listImportedWithoutPrecisePin(): Promise<
  IUnpinnedImport[]
> {
  return db
    .select({
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      addressText: entry.addressText,
      precision: entry.precision,
    })
    .from(entry)
    .where(
      and(
        sql`${entry.importedAt} is not null`,
        eq(entry.onlineOnly, false),
        sql`(${entry.lat} is null or ${entry.precision} is distinct from 'house' and ${entry.precision} is distinct from 'street')`,
      ),
    )
    .orderBy(entry.name);
}
