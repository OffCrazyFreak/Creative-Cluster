import { sql } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";

import type { GeoHit, Geocoder, IGeoQuery } from "../types";
import { parseAddressQuery, type IDguQuery } from "./parse-query";

interface IRow extends Record<string, unknown> {
  name: string;
  settlement: string;
  postcode: string;
  house_number: number | null;
  suffix: string | null;
  lon: number;
  lat: number;
}

function rowsOf(result: unknown): IRow[] {
  return (result as { rows: IRow[] }).rows;
}

// Every word must start a word in search_text, so "unska" never matches "Jarunska".
function wordsMatch(words: string[]) {
  const parts = words.map(
    (word) =>
      sql`(s.search_text like ${`${word}%`} or s.search_text like ${`% ${word}%`})`,
  );
  return sql.join(parts, sql` and `);
}

function toHit(row: IRow): GeoHit {
  const number =
    row.house_number === null ? "" : ` ${row.house_number}${row.suffix ?? ""}`;
  return {
    label: `${row.name}${number}`,
    secondary: [row.postcode, row.settlement].filter(Boolean).join(" "),
    lat: row.lat,
    lng: row.lon,
    city: row.settlement || null,
    countryCode: "HR",
    precision: row.house_number === null ? "street" : "house",
    source: "dgu",
  };
}

// Strict: every typed word starts a word of the street. Fuzzy: trigram word similarity, for
// DGU's abbreviated names ("Trg G. Bulata") and spelling drift ("Strossmayerova" vs "Josipa Jurja Strossmayera").
function streetCandidates(q: IDguQuery, fuzzy: boolean) {
  const words = [...q.streetWords, ...q.placeWords];
  const match = fuzzy
    ? sql`${words.join(" ")} <% s.search_text`
    : sql`${wordsMatch(q.streetWords)} ${q.placeWords.length ? sql`and ${wordsMatch(q.placeWords)}` : sql``}`;
  // Buckets, so that among equally good names the street with more addresses (the bigger town) wins.
  const bucket = fuzzy
    ? sql`floor(word_similarity(${words.join(" ")}, s.search_text) * 10)::int`
    : sql`(s.search_text like ${`${q.streetWords.join(" ")}%`})::int`;
  const place = q.placeWords.length
    ? sql`(${wordsMatch(q.placeWords)})::int * 100`
    : sql`0`;
  return sql`(
    select c.*, (select count(*) from hr_address a where a.street_id = c.id) as n
    from (select s.*, ${place} + ${bucket} as rnk from hr_street s where ${match}
          order by rnk desc, length(s.search_text) limit 60) c
  ) s`;
}

async function runLookup(
  db: DbOrTx,
  q: IDguQuery,
  prefix: boolean,
  limit: number,
  fuzzy: boolean,
): Promise<GeoHit[]> {
  const candidates = streetCandidates(q, fuzzy);
  if (q.houseNumber === null) {
    const result = await db.execute(sql`
      select s.name, s.settlement, s.postcode, null::int as house_number, null::text as suffix,
             avg(a.lon)::float8 as lon, avg(a.lat)::float8 as lat
      from ${candidates}
      join hr_address a on a.street_id = s.id
      group by s.id, s.name, s.settlement, s.postcode, s.rnk, s.n
      order by s.rnk desc, s.n desc
      limit ${limit}
    `);
    return rowsOf(result).map(toHit);
  }
  const numberMatch = prefix
    ? sql`a.house_number::text like ${`${q.houseNumber}%`}`
    : sql`a.house_number = ${q.houseNumber}`;
  const suffixMatch = q.suffix
    ? sql`and a.suffix like ${`${q.suffix}%`}`
    : prefix
      ? sql``
      : sql`and a.suffix = ''`;
  const result = await db.execute(sql`
    select s.name, s.settlement, s.postcode, a.house_number, a.suffix, a.lon::float8 as lon, a.lat::float8 as lat
    from ${candidates}
    join hr_address a on a.street_id = s.id
    where ${numberMatch} ${suffixMatch}
    order by (a.house_number = ${q.houseNumber}) desc, s.rnk desc, s.n desc, a.house_number, a.suffix
    limit ${limit}
  `);
  return rowsOf(result).map(toHit);
}

// prefix: typing "Ilica 6" should offer 6, 6A, 60; a submitted search wants the exact number only.
export async function lookupDgu(
  db: DbOrTx,
  text: string,
  prefix: boolean,
  limit: number,
): Promise<GeoHit[]> {
  const q = parseAddressQuery(text);
  if (q.streetWords.length === 0) return [];
  const strict = await runLookup(db, q, prefix, limit, false);
  return strict.length > 0 ? strict : runLookup(db, q, prefix, limit, true);
}

export function createDgu(db: DbOrTx): Geocoder {
  return {
    id: "dgu",
    covers: (countryCode) => countryCode?.toUpperCase() === "HR",
    suggest: ({ text, limit = 5 }: IGeoQuery) =>
      lookupDgu(db, text, true, limit),
    search: ({ text, limit = 5 }: IGeoQuery) =>
      lookupDgu(db, text, false, limit),
    // No spatial index on the address table; the other providers answer reverse lookups.
    reverse: () => Promise.resolve(null),
  };
}
