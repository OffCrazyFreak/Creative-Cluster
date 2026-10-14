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
import ReportDigestEmail, {
  subject as reportDigestSubject,
} from "./report-digest-email";
import ChangeEmail, { subject as changeSubject } from "./change-email";
import ClaimEmail, { subject as claimSubject } from "./claim-email";
import type { EmailPropsOf } from "./email-types";
import InviteEmail, { subject as inviteSubject } from "./invite-email";
import ResetEmail, { subject as resetSubject } from "./reset-email";
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
};
