import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import type { TranslatableEntity } from "@/constants/translations";
import type { AppLocale } from "@/constants/locales";
import type { DbOrTx } from "@/db/client.server";
import { entry, opportunity } from "@/db/schema";
import {
  splitRichText,
  type IRichTextSkeleton,
} from "@/lib/rich-text/translation-blocks";

export interface ISourceField {
  field: string;
  blocks: string[];
  // Present for rich text, so the translated blocks can be put back into the document.
  skeleton: IRichTextSkeleton | null;
  hash: string;
}

export interface ITranslationSource {
  name: string;
  sourceLocale: AppLocale;
  // Fields that have text; absent or empty fields are left out.
  fields: ISourceField[];
  // Every field name this entity type can translate, to clean up rows of emptied fields.
  allFields: readonly string[];
}

export const ENTRY_FIELDS = ["description", "offering", "seeking"] as const;
export const OPPORTUNITY_FIELDS = ["title", "body"] as const;

function hashOf(sourceLocale: string, value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify([sourceLocale, value]))
    .digest("hex");
}

function plainField(
  field: string,
  text: string,
  sourceLocale: string,
): ISourceField[] {
  const value = text.trim();
  if (!value) return [];
  return [
    {
      field,
      blocks: [value],
      skeleton: null,
      hash: hashOf(sourceLocale, value),
    },
  ];
}

function richField(
  field: string,
  doc: unknown,
  sourceLocale: string,
): ISourceField[] {
  if (!doc) return [];
  try {
    const { blocks, skeleton } = splitRichText(doc);
    if (blocks.length === 0) return [];
    return [{ field, blocks, skeleton, hash: hashOf(sourceLocale, doc) }];
  } catch {
    // A stored document that no longer parses cannot be translated; the original still shows.
    return [];
  }
}

export async function loadTranslationSource(
  tx: DbOrTx,
  entityType: TranslatableEntity,
  entityId: string,
): Promise<ITranslationSource | null> {
  if (entityType === "entry") {
    const [row] = await tx
      .select()
      .from(entry)
      .where(eq(entry.id, entityId))
      .limit(1);
    if (!row) return null;
    const locale = row.sourceLocale as AppLocale;
    return {
      name: row.name,
      sourceLocale: locale,
      allFields: ENTRY_FIELDS,
      fields: [
        ...richField("description", row.description, locale),
        ...plainField("offering", row.offeringText, locale),
        ...plainField("seeking", row.seekingText, locale),
      ],
    };
  }
  const [row] = await tx
    .select({
      title: opportunity.title,
      body: opportunity.body,
      sourceLocale: opportunity.sourceLocale,
      entryName: entry.name,
    })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(eq(opportunity.id, entityId))
    .limit(1);
  if (!row) return null;
  const locale = row.sourceLocale as AppLocale;
  return {
    name: row.entryName,
    sourceLocale: locale,
    allFields: OPPORTUNITY_FIELDS,
    fields: [
      ...plainField("title", row.title, locale),
      ...richField("body", row.body, locale),
    ],
  };
}

// Hash of one field read from its own column only, for the check just before a write.
export async function loadFieldHash(
  tx: DbOrTx,
  entityType: TranslatableEntity,
  entityId: string,
  field: string,
): Promise<string | null> {
  if (entityType === "entry") {
    const [row] = await tx
      .select({
        sourceLocale: entry.sourceLocale,
        description: entry.description,
        offering: entry.offeringText,
        seeking: entry.seekingText,
      })
      .from(entry)
      .where(eq(entry.id, entityId))
      .limit(1);
    if (!row) return null;
    const found =
      field === "description"
        ? richField(field, row.description, row.sourceLocale)
        : plainField(
            field,
            field === "offering" ? row.offering : row.seeking,
            row.sourceLocale,
          );
    return found[0]?.hash ?? null;
  }
  const [row] = await tx
    .select({
      sourceLocale: opportunity.sourceLocale,
      title: opportunity.title,
      body: opportunity.body,
    })
    .from(opportunity)
    .where(eq(opportunity.id, entityId))
    .limit(1);
  if (!row) return null;
  const found =
    field === "body"
      ? richField(field, row.body, row.sourceLocale)
      : plainField(field, row.title, row.sourceLocale);
  return found[0]?.hash ?? null;
}

export function otherLocale(locale: AppLocale): AppLocale {
  return locale === "en" ? "hr" : "en";
}
