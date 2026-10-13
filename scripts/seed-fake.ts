import "./load-env";

import { and, eq, isNull, sql } from "drizzle-orm";

import {
  DESCRIPTIONS_EN,
  DESCRIPTIONS_HR,
  GIVEN_NAMES,
  LEGAL_STATUSES,
  NAME_FIRST,
  NAME_SECOND_ORG,
  OFFERING_EN,
  OFFERING_HR,
  PLACEHOLDER_TAGS,
  SEEKING_EN,
  SEEKING_HR,
  STREETS,
} from "./fake/content";
import { DNZ_PLACES, EU_PLACES } from "./fake/places";
import { createRandom, type Random } from "./fake/random";

// Fake entries go live in the public directory, so only a local database is allowed.
const host = new URL(process.env.DATABASE_URL ?? "postgres://invalid").hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
  console.error(
    `Refusing to seed fake data into ${host}: local databases only.`,
  );
  process.exit(1);
}

const { db } = await import("@/db/client.server");
const { entry, entryTag, slugHistory, tag } = await import("@/db/schema");
const { site } = await import("@/sites");
const { slugify } = await import("@/utils/slugify");

type NewEntry = typeof entry.$inferInsert;
type Visibility = NonNullable<NewEntry["visibility"]>;

const COUNT = 60;
const isDnz = site.id === "dnz";
const places = isDnz ? DNZ_PLACES : EU_PLACES;
const locale = isDnz ? "hr" : "en";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

function visibility(rand: Random): Visibility {
  return {
    website: "public",
    socials: "public",
    contactName: rand.pick(["public", "members"] as const),
    contactEmail: rand.pick(["public", "members", "hidden"] as const),
    contactPhone: rand.pick(["members", "hidden"] as const),
    address: rand.pick(["public", "members"] as const),
  };
}

function statusFor(index: number): NewEntry["status"] {
  if (index % 20 === 7) return "archived";
  if (index % 25 === 11) return "suspended";
  if (index % 30 === 3) return "pending";
  return "published";
}

function fakeEntry(index: number, used: Set<string>): NewEntry {
  const rand = createRandom(index * 7919 + (isDnz ? 3 : 5));
  const place = rand.pick(places);
  const isPerson = isDnz && index % 3 === 2;
  const name = isPerson
    ? `${rand.pick(GIVEN_NAMES)} ${rand.pick(["Primjer", "Uzorak", "Probni"])} (demo)`
    : `${rand.pick(NAME_FIRST)} ${rand.pick(NAME_SECOND_ORG)} ${place.city} (demo)`;
  const baseSlug = slugify(name);
  let slug = baseSlug;
  for (let n = 2; used.has(slug); n += 1) slug = `${baseSlug}-${n}`;
  used.add(slug);

  const status = statusFor(index);
  const descriptions = isDnz ? DESCRIPTIONS_HR : DESCRIPTIONS_EN;
  const offerings = isDnz ? OFFERING_HR : OFFERING_EN;
  const seekings = isDnz ? SEEKING_HR : SEEKING_EN;
  const onlineOnly = !isDnz && !isPerson && index % 29 === 5;
  const townOnly = isPerson || rand.chance(0.2);
  const spread = isPerson ? 0.03 : 0.02;
  const lat = place.lat + (rand.next() - 0.5) * spread;
  const lng = place.lng + (rand.next() - 0.5) * spread;
  const handle = baseSlug.replace(/-demo$/, "");

  return {
    slug,
    kind: isPerson ? "person" : "organization",
    status,
    name,
    sourceLocale: locale,
    descriptionText: rand.pick(descriptions),
    offeringText: isPerson || rand.chance(0.8) ? rand.pick(offerings) : "",
    seekingText: rand.chance(0.7) ? rand.pick(seekings) : "",
    website: `https://example.org/${handle}`,
    socials: { instagram: `https://example.com/${handle}` },
    contactName: isPerson ? name : `Demo Contact ${index + 1}`,
    contactEmail: `${handle}@example.com`,
    contactPhone: "+385 00 000 0000",
    visibility: visibility(rand),
    extra: {
      fake: true,
      ...(isDnz ? {} : { legal_status: rand.pick(LEGAL_STATUSES) }),
    },
    suspendedReason: status === "suspended" ? "Demo suspension" : null,
    onlineOnly,
    addressText:
      onlineOnly || isPerson
        ? null
        : `${rand.pick(STREETS)} ${1 + rand.int(60)}`,
    lat: onlineOnly ? null : lat,
    lng: onlineOnly ? null : lng,
    city: place.city,
    countryCode: place.country,
    precision:
      isPerson || townOnly ? "town" : rand.pick(["house", "street"] as const),
    locationSource: isPerson ? "town_list" : "manual",
    locationDisplay: townOnly ? "town" : "exact",
    publishedAt: status === "published" ? daysAgo(30 + rand.int(300)) : null,
    lastConfirmedAt: rand.chance(0.5) ? daysAgo(rand.int(200)) : null,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(rand.int(120)),
  };
}

async function ensureTags() {
  const [existing] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tag);
  if (existing.count === 0)
    await db.insert(tag).values(
      PLACEHOLDER_TAGS.map((item) => ({
        slug: item.slug,
        labelEn: item.en,
        labelHr: item.hr,
      })),
    );
  return db
    .select({ id: tag.id })
    .from(tag)
    .where(and(eq(tag.status, "active"), isNull(tag.canonicalId)));
}

const tags = await ensureTags();
const used = new Set<string>();
const rows = Array.from({ length: COUNT }, (_, index) =>
  fakeEntry(index, used),
);

const inserted = await db
  .insert(entry)
  .values(rows)
  .onConflictDoNothing()
  .returning({ id: entry.id, slug: entry.slug });

const tagRows = inserted.flatMap(({ id }, index) => {
  const rand = createRandom(index * 104729 + 1);
  function pickTags(field: "topic" | "offering" | "seeking", max: number) {
    return rand
      .sample(tags, rand.int(max + 1))
      .map((item) => ({ entryId: id, tagId: item.id, field }));
  }
  return [
    ...rand.sample(tags, 1 + rand.int(3)).map((item) => ({
      entryId: id,
      tagId: item.id,
      field: "topic" as const,
    })),
    ...pickTags("offering", 2),
    ...pickTags("seeking", 2),
  ];
});
if (tagRows.length > 0)
  await db.insert(entryTag).values(tagRows).onConflictDoNothing();

const [first] = await db
  .select({ id: entry.id, slug: entry.slug })
  .from(entry)
  .where(sql`${entry.slug} = ${slugify(rows[0].name)}`);
if (first)
  await db
    .insert(slugHistory)
    .values({ entryId: first.id, slug: `former-${first.slug}` })
    .onConflictDoNothing();

console.log(
  `${site.id}: inserted ${inserted.length} of ${COUNT} fake entries, ${tagRows.length} tag links (rest already existed).`,
);
process.exit(0);
