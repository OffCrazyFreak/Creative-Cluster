import "./load-env";

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    date: { type: "string" },
    "summary-en": { type: "string" },
    "summary-hr": { type: "string" },
    yes: { type: "boolean", default: false },
  },
});

const summaryEn = values["summary-en"];
const summaryHr = values["summary-hr"];
if (
  !values.date ||
  !/^\d{4}-\d{2}-\d{2}$/.test(values.date) ||
  !summaryEn ||
  !summaryHr
) {
  console.error(
    "Usage: pnpm terms:notify --date 2027-01-01 --summary-en '...' --summary-hr '...' [--yes]\n" +
      "Without --yes it only counts the recipients. Use it for material changes only; write each summary without a final full stop.",
  );
  process.exit(1);
}

const { countTermsRecipients, enqueueTermsNotice } =
  await import("@/lib/email/enqueue-terms-notice.server");

if (!values.yes) {
  console.log(
    `Would queue the terms notice for ${await countTermsRecipients()} users. Add --yes to queue it.`,
  );
} else {
  const total = await enqueueTermsNotice({
    effectiveDate: values.date,
    summary: { en: summaryEn, hr: summaryHr },
  });
  console.log(
    `Queued the terms notice for ${total} users. Run pnpm jobs:drain or wait for the schedule.`,
  );
}
process.exit(0);
