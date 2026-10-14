export type TownRow = [
  name: string,
  lat: number,
  lng: number,
  population: number,
];

export interface ICountryTowns {
  country: string;
  towns: TownRow[];
}

// geonames "geoname" table: 1 name, 4 latitude, 5 longitude, 6 feature class, 8 country code, 14 population.
export function addLine(
  line: string,
  into: Map<string, TownRow[]>,
  countries: ReadonlySet<string>,
) {
  const c = line.split("\t");
  const country = c[8];
  if (!country || !countries.has(country) || c[6] !== "P") return;
  const row: TownRow = [
    c[1],
    Math.round(Number(c[4]) * 1e4) / 1e4,
    Math.round(Number(c[5]) * 1e4) / 1e4,
    Number(c[14] ?? 0),
  ];
  const rows = into.get(country) ?? [];
  rows.push(row);
  into.set(country, rows);
}

export function toCountryFiles(into: Map<string, TownRow[]>): ICountryTowns[] {
  return [...into.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([country, towns]) => ({
      country,
      towns: towns.sort((a, b) => b[3] - a[3]),
    }));
}
