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
      "Without --yes it only counts the recipients. Use it for material changes only.",
  );
  process.exit(1);
}

const { countTermsRecipients, enqueueTermsNotice, isRealDate } =
  await import("@/lib/email/enqueue-terms-notice.server");
if (!isRealDate(values.date)) {
  console.error(`${values.date} is not a real date.`);
  process.exit(1);
}

if (!values.yes) {
  console.log(
    `Would queue the terms notice for ${await countTermsRecipients()} users. Add --yes to queue it.`,
  );
} else {
  const { queued, alreadyQueued } = await enqueueTermsNotice({
    effectiveDate: values.date,
    summary: { en: summaryEn, hr: summaryHr },
  });
  console.log(
    `Queued the terms notice for ${queued} users (${alreadyQueued} were already queued for this date and keep their first text). Run pnpm jobs:drain or wait for the schedule.`,
  );
}
process.exit(0);
