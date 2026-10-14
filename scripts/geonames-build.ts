import "./load-env";

import { createWriteStream } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { LOCATION_COUNTRIES } from "../src/constants/countries";
import { openEntry } from "./dgu/gml-stream";
import { addLine, toCountryFiles, type TownRow } from "./geonames/slim";

// CC BY 4.0 (https://download.geonames.org/export/dump/readme.txt); credit is shown near the town picker.
const URL = "https://download.geonames.org/export/dump/cities500.zip";

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--countries="));
  const wanted = new Set(arg ? arg.slice(12).split(",") : LOCATION_COUNTRIES);
  const cacheDir = join(process.cwd(), "data", "cache");
  const zipPath = join(cacheDir, "cities500.zip");
  await mkdir(cacheDir, { recursive: true });

  const response = await fetch(URL);
  if (!response.ok || !response.body)
    throw new Error(`GeoNames answered ${response.status}`);
  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream),
    createWriteStream(`${zipPath}.part`),
  );
  await rename(`${zipPath}.part`, zipPath);

  const into = new Map<string, TownRow[]>();
  const lines = createInterface({
    input: await openEntry(zipPath, "cities500.txt"),
  });
  for await (const line of lines) addLine(line, into, wanted);

  const outDir = join(process.cwd(), "public", "geo");
  await mkdir(outDir, { recursive: true });
  const files = toCountryFiles(into);
  for (const { country, towns } of files)
    await writeFile(
      join(outDir, `towns-${country}.json`),
      JSON.stringify(towns),
    );
  await writeFile(
    join(outDir, "towns-index.json"),
    JSON.stringify(files.map(({ country, towns }) => [country, towns.length])),
  );
  console.log(
    `Wrote ${files.length} countries, ${files.reduce((n, f) => n + f.towns.length, 0)} towns`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
