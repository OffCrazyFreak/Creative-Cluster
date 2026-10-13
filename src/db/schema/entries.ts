import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  ENTRY_KINDS,
  ENTRY_STATUSES,
  LOCATION_DISPLAYS,
  LOCATION_PRECISIONS,
  LOCATION_SOURCES,
  type EntryKind,
  type EntryStatus,
  type FieldVisibility,
  type LocationDisplay,
  type LocationPrecision,
  type LocationSource,
} from "@/constants/entry";
import { LOCALES } from "@/constants/locales";
import type { RichTextDoc } from "@/typings/rich-text";

import { createdAt, id, oneOf, timestamptz, updatedAt } from "../columns";
import { user } from "./auth";
import { image } from "./images";

export const entry = pgTable(
  "entry",
  {
    id: id(),
    slug: text().notNull(),
    kind: text().$type<EntryKind>().notNull(),
    status: text().$type<EntryStatus>().notNull().default("draft"),
    trusted: boolean().notNull().default(true),
    ownerUserId: uuid().references(() => user.id, { onDelete: "set null" }),
    name: text().notNull(),
    sourceLocale: text().notNull(),
    description: jsonb().$type<RichTextDoc>(),
    descriptionText: text().notNull().default(""),
    offeringText: text().notNull().default(""),
    seekingText: text().notNull().default(""),
    website: text(),
    socials: jsonb().$type<Record<string, string>>().notNull().default({}),
    contactName: text(),
    contactEmail: text(),
    contactPhone: text(),
    contactEmailInvalid: boolean().notNull().default(false),
    visibility: jsonb()
      .$type<Partial<Record<string, FieldVisibility>>>()
      .notNull()
      .default({}),
    consentAt: timestamptz(),
    consentVersion: text(),
    extra: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    extraSchemaVersion: integer().notNull().default(1),
    logoImageId: uuid().references(() => image.id, { onDelete: "set null" }),
    coverImageId: uuid().references(() => image.id, { onDelete: "set null" }),
    matchingOptOut: boolean().notNull().default(false),
    lastConfirmedAt: timestamptz(),
    suspendedReason: text(),
    onlineOnly: boolean().notNull().default(false),
    addressText: text(),
    lat: doublePrecision(),
    lng: doublePrecision(),
    city: text(),
    countryCode: text(),
    precision: text().$type<LocationPrecision>(),
    locationSource: text().$type<LocationSource>(),
    pinMovedByHand: boolean().notNull().default(false),
    geocodedAt: timestamptz(),
    locationDisplay: text().$type<LocationDisplay>().notNull().default("exact"),
    importedAt: timestamptz(),
    erasureRequestedAt: timestamptz(),
    publishedAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("entry_slug_lower_idx").on(sql`lower(${t.slug})`),
    index().on(t.status, t.kind),
    index().on(t.ownerUserId),
    index().on(t.logoImageId),
    index().on(t.coverImageId),
    index("entry_published_at_idx")
      .on(sql`${t.publishedAt} desc`)
      .where(sql`${t.status} = 'published'`),
    check("entry_kind_check", oneOf(t.kind, ENTRY_KINDS)),
    check("entry_source_locale_check", oneOf(t.sourceLocale, LOCALES)),
    check("entry_status_check", oneOf(t.status, ENTRY_STATUSES)),
    check("entry_precision_check", oneOf(t.precision, LOCATION_PRECISIONS)),
    check(
      "entry_location_source_check",
      oneOf(t.locationSource, LOCATION_SOURCES),
    ),
    check(
      "entry_location_display_check",
      oneOf(t.locationDisplay, LOCATION_DISPLAYS),
    ),
  ],
);

// Same case-insensitive rule as entry.slug; the slug service removes a history row when it becomes current again.
export const slugHistory = pgTable(
  "slug_history",
  {
    id: id(),
    entryId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    slug: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("slug_history_slug_lower_idx").on(sql`lower(${t.slug})`),
    index().on(t.entryId),
  ],
);

export const claimInvite = pgTable(
  "claim_invite",
  {
    id: id(),
    entryId: uuid()
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    email: text().notNull(),
    tokenHash: text().notNull().unique("claim_invite_token_hash_unique"),
    expiresAt: timestamptz().notNull(),
    usedAt: timestamptz(),
    sentAt: timestamptz(),
    reminderSentAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.entryId)],
);
