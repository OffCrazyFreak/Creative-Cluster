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

export interface IOpportunityApprovedEmailProps extends IBaseEmailProps {
  entryName: string;
  opportunityTitle: string;
  expiresAt: string;
  link: string;
}

export interface IOpportunityRejectedEmailProps extends IBaseEmailProps {
  entryName: string;
  opportunityTitle: string;
  reasonCode: ReasonCode;
  note: string | null;
  link: string;
}

export interface IOpportunityRemovedEmailProps extends IBaseEmailProps {
  opportunityTitle: string;
  reasonCode: ReasonCode;
  note: string | null;
  link: string;
}

export interface IEmailPropsMap {
  invite: IInviteEmailProps;
  claim: IClaimEmailProps;
  verify: IVerifyEmailProps;
  reset: IResetEmailProps;
  change: IChangeEmailProps;
  opportunity_approved: IOpportunityApprovedEmailProps;
  opportunity_rejected: IOpportunityRejectedEmailProps;
  opportunity_removed: IOpportunityRemovedEmailProps;
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
