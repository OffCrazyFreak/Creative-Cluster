import "./load-env";

import { join } from "node:path";

import { Client } from "pg";

import { readAddresses } from "./dgu/addresses";
import { downloadDguZip } from "./dgu/download";
import {
  createStaging,
  indexStaging,
  loadStaging,
  swapStaging,
} from "./dgu/load";
import { readReferenceData } from "./dgu/reference-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const force = process.argv.includes("--force");

  const { zipPath, updated, fresh } = await downloadDguZip(
    join(process.cwd(), "data", "cache"),
    force,
  );
  console.log(
    `DGU zip ${fresh ? "downloaded" : "from cache"}, source updated ${updated}`,
  );

  const reference = await readReferenceData(zipPath);
  console.log(
    `Reference: ${reference.thoroughfares.size} streets, ${reference.postal.size} postal areas, ${reference.settlements.size} settlements`,
  );

  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await createStaging(db);
    const totals = await loadStaging(
      db,
      readAddresses(zipPath, reference),
      (count) => {
        if (count % 100_000 < 5000) console.log(`  ${count} addresses`);
      },
    );
    await indexStaging(db);
    await swapStaging(db, { sourceUpdated: updated });
    console.log(
      `Swapped in ${totals.addresses} addresses, ${totals.streets} streets`,
    );
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
