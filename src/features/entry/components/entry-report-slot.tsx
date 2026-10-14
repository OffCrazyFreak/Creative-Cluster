import ReportDialog from "@/features/review/components/report-dialog";

interface IEntryReportSlotProps {
  entryId: string;
  slug: string;
  name: string;
}

export default function EntryReportSlot({
  entryId,
  name,
}: IEntryReportSlotProps) {
  return <ReportDialog entryId={entryId} name={name} />;
}
