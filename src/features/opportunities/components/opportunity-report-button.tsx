import { OPPORTUNITY_REPORT_MESSAGE_MAX } from "@/constants/opportunities";
import ReportDialog from "@/features/review/components/report-dialog";
import { m } from "@/paraglide/messages";

import { reportOpportunityFn } from "../opportunity-public.functions";

interface IOpportunityReportButtonProps {
  id: string;
}

export default function OpportunityReportButton({
  id,
}: IOpportunityReportButtonProps) {
  return (
    <ReportDialog
      trigger={m.opportunities_report_button()}
      title={m.opportunities_report_title()}
      description={m.opportunities_report_body()}
      messageMax={OPPORTUNITY_REPORT_MESSAGE_MAX}
      send={async ({ message, turnstileToken, fax }) => {
        const { status } = await reportOpportunityFn({
          data: { id, message, turnstileToken, fax },
        });
        return status;
      }}
    />
  );
}
