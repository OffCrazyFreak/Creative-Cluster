import { REPORT_MESSAGE_MAX } from "@/constants/review";
import ReportDialog from "@/features/review/components/report-dialog";
import { reportEntryFn } from "@/features/review/review.functions";
import { m } from "@/paraglide/messages";

interface IEntryReportSlotProps {
  entryId: string;
  slug: string;
  name: string;
}

export default function EntryReportSlot({
  entryId,
  name,
}: IEntryReportSlotProps) {
  return (
    <ReportDialog
      withReason
      trigger={m.entry_report_button()}
      title={m.review_report_title({ name })}
      description={m.review_report_body()}
      messageMax={REPORT_MESSAGE_MAX}
      send={async (submission) =>
        (await reportEntryFn({ data: { entryId, ...submission } })).status
      }
    />
  );
}
