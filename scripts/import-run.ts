import "./load-env";

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    "allow-duplicates": { type: "boolean", default: false },
  },
});
const path = positionals[0];
if (!path) {
  console.error("Usage: pnpm import:run <staging.json> [--dry-run]");
  process.exit(1);
}

// Dynamic imports: the env must be loaded before the database client reads it.
const { stagingFileSchema } =
  await import("../src/features/import/import-schemas");
const { DUPLICATE_TEXT, WARNING_TEXT } =
  await import("../src/features/import/import-plan-codes");
const { planImport } =
  await import("../src/features/import/import-plan.server");
const { runImport, listImportedWithoutPrecisePin } =
  await import("../src/features/import/import-run.server");

const file = stagingFileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
const plan = await planImport(file);
console.log(
  `${plan.total} in file: ${plan.toCreate.length} new, ${plan.alreadyImported.length} already imported, ${plan.duplicates.length} possible duplicates, ${plan.warnings.length} warnings`,
);
for (const dup of plan.duplicates)
  console.log(
    `  duplicate? ${dup.name}: ${DUPLICATE_TEXT[dup.reason]}${dup.other ? ` (${dup.other})` : ""}`,
  );
for (const warning of plan.warnings)
  console.log(
    `  warning: ${warning.name}: ${WARNING_TEXT[warning.code]}${warning.detail ? ` (${warning.detail})` : ""}`,
  );

if (values["dry-run"]) {
  console.log("Dry run: nothing was written.");
  process.exit(0);
}

if (plan.duplicates.length > 0 && !values["allow-duplicates"]) {
  console.error(
    "Possible duplicates found. Fix the file, or pass --allow-duplicates to import them anyway.",
  );
  process.exit(1);
}

const result = await runImport(file);
console.log(`Imported ${result.created}, skipped ${result.skipped} existing.`);
const unpinned = await listImportedWithoutPrecisePin();
console.log(
  `Admin pin check: ${unpinned.length} imported listings without a precise pin`,
);
for (const item of unpinned)
  console.log(
    `  /admin/entry/${item.id}  ${item.name}  (${item.precision ?? "no pin"})`,
  );
process.exit(0);
