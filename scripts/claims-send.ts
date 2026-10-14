import "./load-env";

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    batch: { type: "string" },
    confirm: { type: "boolean", default: false },
    "import-source": { type: "string" },
  },
});

// Imported before anything touches the database: a refused run must not even connect.
const { sendBlocker } = await import("../src/features/claims/send-guard");
const blocker = sendBlocker(process.env, {
  batch: values.batch ? Number(values.batch) : null,
  confirm: values.confirm,
  importSource: values["import-source"] ?? null,
});
if (blocker) {
  console.error(blocker);
  process.exit(1);
}

const { sendClaimBatch } =
  await import("../src/features/claims/send-claims.server");
const result = await sendClaimBatch(
  Number(values.batch),
  values["import-source"] ?? "",
);
console.log(
  `Queued ${result.reminders} reminders and ${result.invites} claim emails. The job drain sends them (pnpm jobs:drain).`,
);
process.exit(0);
