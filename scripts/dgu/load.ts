import type { Client } from "pg";

import { normalizeSearch } from "../../src/utils/normalize-search";
import type { IDguAddress } from "./addresses";

const BATCH = 5000;
export const DGU_META_KEY = "meta:dgu";

interface IStreetRow {
  id: number;
  name: string;
  settlement: string;
  postcode: string;
  searchText: string;
}

export function streetKey(a: IDguAddress): string {
  return [a.street, a.settlement, a.postcode, a.postName].join("|");
}

// The post office town is searchable too: villages are often addressed by it.
export function streetRow(id: number, a: IDguAddress): IStreetRow {
  const parts = [
    a.street,
    a.settlement,
    a.postName === a.settlement ? "" : a.postName,
    a.postcode,
  ];
  return {
    id,
    name: a.street,
    settlement: a.settlement,
    postcode: a.postcode,
    searchText: normalizeSearch(parts.join(" ")),
  };
}

export async function createStaging(db: Client) {
  await db.query(`
    drop table if exists hr_address_next, hr_street_next;
    create table hr_street_next (like hr_street including defaults);
    create table hr_address_next (like hr_address including defaults);
  `);
}

async function insertStreets(db: Client, rows: IStreetRow[]) {
  await db.query(
    `insert into hr_street_next (id, name, settlement, postcode, search_text)
     select * from unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[])`,
    [
      rows.map((r) => r.id),
      rows.map((r) => r.name),
      rows.map((r) => r.settlement),
      rows.map((r) => r.postcode),
      rows.map((r) => r.searchText),
    ],
  );
}

async function insertAddresses(
  db: Client,
  rows: { streetId: number; address: IDguAddress }[],
) {
  await db.query(
    `insert into hr_address_next (street_id, house_number, suffix, lon, lat)
     select * from unnest($1::int[], $2::int[], $3::text[], $4::real[], $5::real[])`,
    [
      rows.map((r) => r.streetId),
      rows.map((r) => r.address.houseNumber),
      rows.map((r) => r.address.suffix),
      rows.map((r) => r.address.lon),
      rows.map((r) => r.address.lat),
    ],
  );
}

export async function loadStaging(
  db: Client,
  addresses: AsyncIterable<IDguAddress>,
  onProgress: (count: number) => void,
) {
  const streetIds = new Map<string, number>();
  let streets: IStreetRow[] = [];
  let pending: { streetId: number; address: IDguAddress }[] = [];
  // The table keys on street, number and suffix; DGU holds several points for some addresses and the first wins.
  const seen = new Set<string>();
  let total = 0;

  async function flush() {
    // Streets first so the foreign key added after loading never sees a gap.
    await insertStreets(db, streets);
    await insertAddresses(db, pending);
    total += pending.length;
    streets = [];
    pending = [];
    onProgress(total);
  }

  for await (const address of addresses) {
    const key = streetKey(address);
    let streetId = streetIds.get(key);
    if (streetId === undefined) {
      streetId = streetIds.size + 1;
      streetIds.set(key, streetId);
      streets.push(streetRow(streetId, address));
    }
    const addressKey = `${streetId}|${address.houseNumber}|${address.suffix}`;
    if (seen.has(addressKey)) continue;
    seen.add(addressKey);
    pending.push({ streetId, address });
    if (pending.length >= BATCH) await flush();
  }
  if (pending.length > 0) await flush();
  return { addresses: total, streets: streetIds.size };
}

export async function indexStaging(db: Client) {
  await db.query(`
    alter table hr_street_next add constraint hr_street_next_pkey primary key (id);
    create index hr_street_search_trgm_idx_next on hr_street_next using gin (search_text gin_trgm_ops);
    alter table hr_address_next add constraint hr_address_street_id_house_number_suffix_pk_next
      primary key (street_id, house_number, suffix);
    alter table hr_address_next add constraint hr_address_street_id_hr_street_id_fk_next
      foreign key (street_id) references hr_street_next (id) on delete cascade;
    analyze hr_street_next;
    analyze hr_address_next;
  `);
}

// One transaction: readers see the old tables until commit, never a half-loaded set.
export async function swapStaging(
  db: Client,
  meta: { sourceUpdated: string },
  minRatio = 0.5,
) {
  async function count(table: string) {
    return Number(
      (await db.query<{ n: string }>(`select count(*) n from ${table}`)).rows[0]
        .n,
    );
  }
  const previous = await count("hr_address").catch(() => 0);
  const next = await count("hr_address_next");
  if (next === 0 || next < previous * minRatio)
    throw new Error(`Refusing to swap: ${next} new rows against ${previous}`);

  await db.query("begin");
  try {
    await db.query(`
      drop table hr_address, hr_street;
      alter table hr_street_next rename to hr_street;
      alter table hr_address_next rename to hr_address;
      alter index hr_street_next_pkey rename to hr_street_pkey;
      alter index hr_street_search_trgm_idx_next rename to hr_street_search_trgm_idx;
      alter index hr_address_street_id_house_number_suffix_pk_next rename to hr_address_street_id_house_number_suffix_pk;
      alter table hr_address rename constraint hr_address_street_id_hr_street_id_fk_next to hr_address_street_id_hr_street_id_fk;
    `);
    await db.query(
      `insert into geocode_cache (key, provider, hits) values ($1, 'dgu', $2::jsonb)
       on conflict (key) do update set hits = excluded.hits, created_at = now()`,
      [
        DGU_META_KEY,
        JSON.stringify([
          {
            downloadedAt: new Date().toISOString(),
            sourceUpdated: meta.sourceUpdated,
          },
        ]),
      ],
    );
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}
