import { createHash } from "node:crypto";

import { asc, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { loadPublicTags } from "@/features/entry/entry-tags.server";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { publicLocation } from "@/features/entry/public-location";

import { makeBlurb } from "./blurb";
import type {
  IDirectoryEntry,
  IDirectoryTag,
  IMapDirectory,
} from "./directory-schemas";

// Worst case a suspended or archived entry stays on the map for this long on another server instance.
export const MAP_DIRECTORY_CACHE_MS = 30_000;
let cache: { at: number; value: IMapDirectory } | null = null;

// Mutation services call this after a publish, edit, suspend or archive.
export function invalidateMapDirectory() {
  cache = null;
}

async function buildMapDirectory(): Promise<IMapDirectory> {
  const rows = await db
    .select({
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      kind: entry.kind,
      descriptionText: entry.descriptionText,
      extra: entry.extra,
      onlineOnly: entry.onlineOnly,
      city: entry.city,
      countryCode: entry.countryCode,
      lat: entry.lat,
      lng: entry.lng,
      locationDisplay: entry.locationDisplay,
      visibility: entry.visibility,
    })
    .from(entry)
    .where(publicEntryCondition())
    .orderBy(asc(sql`lower(${entry.name})`), asc(entry.id));
  const tagsByEntry = await loadPublicTags(
    db,
    rows.map((row) => row.id),
  );

  const dictionary: IDirectoryTag[] = [];
  const indexBySlug = new Map<string, number>();
  const entries: IDirectoryEntry[] = rows.map((row) => {
    // Visitor view only: members-only fields never enter this shared, cacheable payload.
    const location = publicLocation({ ...row, addressText: null }, false);
    const tags = (tagsByEntry.get(row.id) ?? []).map((item) => {
      let index = indexBySlug.get(item.slug);
      if (index === undefined) {
        index = dictionary.length;
        indexBySlug.set(item.slug, index);
        dictionary.push({
          slug: item.slug,
          en: item.labelEn,
          hr: item.labelHr,
        });
      }
      return index;
    });
    const legal = row.extra.legal_status;
    return {
      slug: row.slug,
      name: row.name,
      kind: row.kind === "person" ? "person" : "organization",
      lat: location.lat === null ? null : Math.round(location.lat * 1e5) / 1e5,
      lng: location.lng === null ? null : Math.round(location.lng * 1e5) / 1e5,
      city: location.city,
      country: location.countryCode,
      legal: typeof legal === "string" ? legal : null,
      blurb: makeBlurb(row.descriptionText),
      tags: [...new Set(tags)],
    };
  });

  const body = { tags: dictionary, entries };
  const hash = createHash("sha1")
    .update(JSON.stringify(body))
    .digest("hex")
    .slice(0, 12);
  return { hash, ...body };
}

export async function getMapDirectory(): Promise<IMapDirectory> {
  if (cache && Date.now() - cache.at < MAP_DIRECTORY_CACHE_MS)
    return cache.value;
  const value = await buildMapDirectory();
  cache = { at: Date.now(), value };
  return value;
}
