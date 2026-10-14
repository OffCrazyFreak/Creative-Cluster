import { and, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, tag } from "@/db/schema";

import type { StagingFile, StagingOrganization } from "./import-schemas";
import type {
  ImportDuplicateReason,
  ImportWarningCode,
} from "./import-plan-codes";

export interface IImportWarning {
  legacyId: string;
  name: string;
  code: ImportWarningCode;
  // The tag slug for unknown_tag.
  detail?: string;
}

export interface IImportDuplicate {
  legacyId: string;
  name: string;
  reason: ImportDuplicateReason;
  // The name of the existing listing, when there is one.
  other?: string;
}

export interface IImportPlan {
  total: number;
  toCreate: string[];
  alreadyImported: string[];
  duplicates: IImportDuplicate[];
  warnings: IImportWarning[];
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function warningsOf(
  org: StagingOrganization,
  knownTags: Set<string>,
): IImportWarning[] {
  const found: Pick<IImportWarning, "code" | "detail">[] = [];
  if (org.contactEmail === "") found.push({ code: "no_email" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(org.contactEmail))
    found.push({ code: "bad_email" });
  if (org.location.lat === null) found.push({ code: "no_pin" });
  else if (org.location.precision === "town") found.push({ code: "town_pin" });
  if (!org.website) found.push({ code: "no_website" });
  for (const slug of org.topics)
    if (!knownTags.has(slug)) found.push({ code: "unknown_tag", detail: slug });
  return found.map((item) => ({
    legacyId: org.legacyId,
    name: org.name,
    ...item,
  }));
}

// Read-only: what an import would do, so the admin page and the script can show it first.
export async function planImport(file: StagingFile): Promise<IImportPlan> {
  const orgs = file.organizations;
  const legacyIds = orgs.map((org) => org.legacyId);
  const existingIds = new Set(
    (
      await db
        .select({ legacyId: sql<string>`${entry.extra}->>'legacy_id'` })
        .from(entry)
        .where(inArray(sql`${entry.extra}->>'legacy_id'`, legacyIds))
    ).map((row) => row.legacyId),
  );
  const fresh = orgs.filter((org) => !existingIds.has(org.legacyId));

  const names = fresh.map((org) => org.name.toLowerCase());
  const existing = names.length
    ? await db
        .select({ name: entry.name, website: entry.website })
        .from(entry)
        .where(
          sql`lower(${entry.name}) in ${names} or ${entry.website} is not null`,
        )
    : [];
  const byName = new Map(existing.map((row) => [row.name.toLowerCase(), row]));
  const byHost = new Map<string, string>();
  for (const row of existing) {
    const host = row.website ? hostOf(row.website) : null;
    if (host) byHost.set(host, row.name);
  }

  const seenName = new Map<string, string>();
  const seenHost = new Map<string, string>();
  const duplicates: IImportDuplicate[] = [];
  for (const org of fresh) {
    const host = hostOf(org.website);
    const sameName = byName.get(org.name.toLowerCase());
    const sameHost = host ? byHost.get(host) : undefined;
    const match: Pick<IImportDuplicate, "reason" | "other"> | null = sameName
      ? { reason: "existing_name", other: sameName.name }
      : sameHost
        ? { reason: "existing_website", other: sameHost }
        : seenName.has(org.name.toLowerCase())
          ? { reason: "file_name" }
          : host && seenHost.has(host)
            ? { reason: "file_website" }
            : null;
    if (match)
      duplicates.push({ legacyId: org.legacyId, name: org.name, ...match });
    seenName.set(org.name.toLowerCase(), org.legacyId);
    if (host) seenHost.set(host, org.legacyId);
  }

  const slugs = [...new Set(orgs.flatMap((org) => org.topics))];
  const known = slugs.length
    ? await db
        .select({ slug: tag.slug })
        .from(tag)
        .where(and(inArray(tag.slug, slugs), isNull(tag.canonicalId)))
    : [];
  const knownTags = new Set(known.map((row) => row.slug));

  return {
    total: orgs.length,
    toCreate: fresh.map((org) => org.legacyId),
    alreadyImported: orgs
      .filter((org) => existingIds.has(org.legacyId))
      .map((org) => org.legacyId),
    duplicates,
    warnings: fresh.flatMap((org) => warningsOf(org, knownTags)),
  };
}
