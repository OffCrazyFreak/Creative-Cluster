import type { EmailExpiry, EmailTemplateName } from "@/constants/email";
import type { AppLocale } from "@/constants/locales";
import type { ReasonCode } from "@/constants/moderation";

// Props are plain JSON because they are stored in the job payload.
export interface IBaseEmailProps {
  locale: AppLocale;
}

export interface IInviteEmailProps extends IBaseEmailProps {
  link: string;
  expiry: EmailExpiry;
}

export interface IClaimEmailProps extends IBaseEmailProps {
  entryName: string;
  link: string;
  removeLink: string;
  expiry: EmailExpiry;
  importSource: string;
  archiveDate: string;
}

export interface IVerifyEmailProps extends IBaseEmailProps {
  link: string;
  expiry: EmailExpiry;
  entryName?: string;
}

export interface IResetEmailProps extends IBaseEmailProps {
  link: string;
  expiry: EmailExpiry;
}

export interface IChangeEmailProps extends IBaseEmailProps {
  link: string;
  expiry: EmailExpiry;
}

export interface IApplicationReceivedEmailProps extends IBaseEmailProps {
  entryName: string;
}

export interface IApprovedEmailProps extends IBaseEmailProps {
  entryName: string;
  link: string;
  expiry: EmailExpiry;
  newAccount: boolean;
  // True when the account has no password yet, whether it is new or was created another way.
  needsPassword: boolean;
}

export interface IRejectedEmailProps extends IBaseEmailProps {
  entryName: string;
  link: string;
  reasonCode: ReasonCode;
  note: string | null;
}

export interface IDigestItem {
  name: string;
  detail: string;
  ageDays: number;
}

export interface IApplicationDigestEmailProps extends IBaseEmailProps {
  count: number;
  openTotal: number;
  oldestAgeDays: number;
  items: IDigestItem[];
  link: string;
}

export interface IReportDigestEmailProps extends IBaseEmailProps {
  count: number;
  items: IDigestItem[];
  link: string;
}

export interface IEditRevertedEmailProps extends IBaseEmailProps {
  entryName: string;
  fieldGroups: string[];
  reason: string;
  link: string;
}

export interface ISuspendedEmailProps extends IBaseEmailProps {
  entryName: string;
  reason: string;
  link: string;
}

export interface IErasureScheduledEmailProps extends IBaseEmailProps {
  entryName: string | null;
  // ISO timestamp; the template formats it for the recipient's language.
  deleteDate: string;
  link: string;
}

export interface IErasureDoneEmailProps extends IBaseEmailProps {
  entryName: string | null;
}

export interface IEmailPropsMap {
  invite: IInviteEmailProps;
  claim: IClaimEmailProps;
  verify: IVerifyEmailProps;
  reset: IResetEmailProps;
  change: IChangeEmailProps;
  application_received: IApplicationReceivedEmailProps;
  approved: IApprovedEmailProps;
  rejected: IRejectedEmailProps;
  application_digest: IApplicationDigestEmailProps;
  report_digest: IReportDigestEmailProps;
  edit_reverted: IEditRevertedEmailProps;
  suspended: ISuspendedEmailProps;
  erasure_scheduled: IErasureScheduledEmailProps;
  erasure_done: IErasureDoneEmailProps;
}

export type EmailPropsOf<T extends EmailTemplateName> = IEmailPropsMap[T];

export interface IEmailJobPayload<
  T extends EmailTemplateName = EmailTemplateName,
> {
  template: T;
  to: string;
  props: EmailPropsOf<T>;
  replyTo?: string;
}
