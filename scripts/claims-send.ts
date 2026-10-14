import "./load-env";

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    batch: { type: "string" },
    confirm: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "import-source": { type: "string" },
  },
});

// Imported before anything touches the database: a refused run must not even connect.
const { sendBlocker } = await import("../src/features/claims/send-guard");
const blocker = sendBlocker(process.env, {
  batch: values.batch ? Number(values.batch) : null,
  confirm: values.confirm,
  dryRun: values["dry-run"],
  importSource: values["import-source"] ?? null,
});
if (blocker) {
  console.error(blocker);
  process.exit(1);
}

const { planClaimBatch, sendClaimBatch } =
  await import("../src/features/claims/send-claims.server");
const batch = Number(values.batch);

// A dry run wins over --confirm, so the safe reading is always taken.
if (values["dry-run"]) {
  const plan = await planClaimBatch(batch);
  console.log(
    `Dry run: would queue ${plan.reminders} reminders and ${plan.invites} claim emails. Nothing was written.`,
  );
  if (plan.failedFirstMails > 0)
    console.log(
      `${plan.failedFirstMails} first mails are marked sent but their job failed: check the job table.`,
    );
  process.exit(0);
}

const result = await sendClaimBatch(batch, values["import-source"] ?? "");
console.log(
  `Queued ${result.reminders} reminders and ${result.invites} claim emails. The job drain sends them (pnpm jobs:drain).`,
);
process.exit(0);
