import type { ReactElement } from "react";

import type { EmailTemplateName } from "@/constants/email";

import ApplicationReceivedEmail, {
  subject as applicationReceivedSubject,
} from "./application-received-email";
import ApplicationDigestEmail, {
  subject as applicationDigestSubject,
} from "./application-digest-email";
import ApprovedEmail, { subject as approvedSubject } from "./approved-email";
import RejectedEmail, { subject as rejectedSubject } from "./rejected-email";
import EditRevertedEmail, {
  subject as editRevertedSubject,
} from "./edit-reverted-email";
import SuspendedEmail, { subject as suspendedSubject } from "./suspended-email";
import ErasureDoneEmail, {
  subject as erasureDoneSubject,
} from "./erasure-done-email";
import ErasureScheduledEmail, {
  subject as erasureScheduledSubject,
} from "./erasure-scheduled-email";
import ReportDigestEmail, {
  subject as reportDigestSubject,
} from "./report-digest-email";
import BlockedEmail, { subject as blockedSubject } from "./blocked-email";
import ChangeEmail, { subject as changeSubject } from "./change-email";
import ClaimEmail, { subject as claimSubject } from "./claim-email";
import ClaimReminderEmail, {
  subject as claimReminderSubject,
} from "./claim-reminder-email";
import ContactEmail, { subject as contactSubject } from "./contact-email";
import ConnectionEmail, {
  subject as connectionSubject,
} from "./connection-email";
import type { EmailPropsOf } from "./email-types";
import InviteEmail, { subject as inviteSubject } from "./invite-email";
import OpportunityApprovedEmail, {
  subject as opportunityApprovedSubject,
} from "./opportunity-approved-email";
import OpportunityRejectedEmail, {
  subject as opportunityRejectedSubject,
} from "./opportunity-rejected-email";
import OpportunityRemovedEmail, {
  subject as opportunityRemovedSubject,
} from "./opportunity-removed-email";
import ResetEmail, { subject as resetSubject } from "./reset-email";
import TermsEmail, { subject as termsSubject } from "./terms-email";
import VerifyEmail, { subject as verifySubject } from "./verify-email";

interface ITemplate<P> {
  element: (props: P) => ReactElement;
  subject: (props: P) => string;
  previewProps: P;
}

type TemplateMap = { [T in EmailTemplateName]: ITemplate<EmailPropsOf<T>> };

// One entry per template; the render script, the job and the smoke test all read this map.
export const EMAIL_TEMPLATES: TemplateMap = {
  invite: {
    element: (props) => <InviteEmail {...props} />,
    subject: inviteSubject,
    previewProps: InviteEmail.PreviewProps,
  },
  claim: {
    element: (props) => <ClaimEmail {...props} />,
    subject: claimSubject,
    previewProps: ClaimEmail.PreviewProps,
  },
  claim_reminder: {
    element: (props) => <ClaimReminderEmail {...props} />,
    subject: claimReminderSubject,
    previewProps: ClaimReminderEmail.PreviewProps,
  },
  verify: {
    element: (props) => <VerifyEmail {...props} />,
    subject: verifySubject,
    previewProps: VerifyEmail.PreviewProps,
  },
  reset: {
    element: (props) => <ResetEmail {...props} />,
    subject: resetSubject,
    previewProps: ResetEmail.PreviewProps,
  },
  change: {
    element: (props) => <ChangeEmail {...props} />,
    subject: changeSubject,
    previewProps: ChangeEmail.PreviewProps,
  },
  opportunity_approved: {
    element: (props) => <OpportunityApprovedEmail {...props} />,
    subject: opportunityApprovedSubject,
    previewProps: OpportunityApprovedEmail.PreviewProps,
  },
  opportunity_rejected: {
    element: (props) => <OpportunityRejectedEmail {...props} />,
    subject: opportunityRejectedSubject,
    previewProps: OpportunityRejectedEmail.PreviewProps,
  },
  opportunity_removed: {
    element: (props) => <OpportunityRemovedEmail {...props} />,
    subject: opportunityRemovedSubject,
    previewProps: OpportunityRemovedEmail.PreviewProps,
  },
  application_received: {
    element: (props) => <ApplicationReceivedEmail {...props} />,
    subject: applicationReceivedSubject,
    previewProps: ApplicationReceivedEmail.PreviewProps,
  },
  approved: {
    element: (props) => <ApprovedEmail {...props} />,
    subject: approvedSubject,
    previewProps: ApprovedEmail.PreviewProps,
  },
  rejected: {
    element: (props) => <RejectedEmail {...props} />,
    subject: rejectedSubject,
    previewProps: RejectedEmail.PreviewProps,
  },
  application_digest: {
    element: (props) => <ApplicationDigestEmail {...props} />,
    subject: applicationDigestSubject,
    previewProps: ApplicationDigestEmail.PreviewProps,
  },
  report_digest: {
    element: (props) => <ReportDigestEmail {...props} />,
    subject: reportDigestSubject,
    previewProps: ReportDigestEmail.PreviewProps,
  },
  edit_reverted: {
    element: (props) => <EditRevertedEmail {...props} />,
    subject: editRevertedSubject,
    previewProps: EditRevertedEmail.PreviewProps,
  },
  suspended: {
    element: (props) => <SuspendedEmail {...props} />,
    subject: suspendedSubject,
    previewProps: SuspendedEmail.PreviewProps,
  },
  erasure_scheduled: {
    element: (props) => <ErasureScheduledEmail {...props} />,
    subject: erasureScheduledSubject,
    previewProps: ErasureScheduledEmail.PreviewProps,
  },
  erasure_done: {
    element: (props) => <ErasureDoneEmail {...props} />,
    subject: erasureDoneSubject,
    previewProps: ErasureDoneEmail.PreviewProps,
  },
  contact: {
    element: (props) => <ContactEmail {...props} />,
    subject: contactSubject,
    previewProps: ContactEmail.PreviewProps,
  },
  terms: {
    element: (props) => <TermsEmail {...props} />,
    subject: termsSubject,
    previewProps: TermsEmail.PreviewProps,
  },
  blocked: {
    element: (props) => <BlockedEmail {...props} />,
    subject: blockedSubject,
    previewProps: BlockedEmail.PreviewProps,
  },
  connection: {
    element: (props) => <ConnectionEmail {...props} />,
    subject: connectionSubject,
    previewProps: ConnectionEmail.PreviewProps,
  },
};
