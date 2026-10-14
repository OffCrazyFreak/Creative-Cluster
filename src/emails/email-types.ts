import type { EmailExpiry, EmailTemplateName } from "@/constants/email";
import type { AppLocale } from "@/constants/locales";

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

export interface IContactEmailProps extends IBaseEmailProps {
  entryName: string;
  senderName: string;
  senderEmail: string;
  messageText: string;
  // The "Report this message" link; named link like every other template's main link.
  link: string;
}

export interface ITermsEmailProps extends IBaseEmailProps {
  name: string;
  summary: string;
  effectiveDate: string;
  link: string;
}

export interface IBlockedEmailProps extends IBaseEmailProps {
  name: string;
  reason: string;
}

export interface IEmailPropsMap {
  invite: IInviteEmailProps;
  claim: IClaimEmailProps;
  verify: IVerifyEmailProps;
  reset: IResetEmailProps;
  change: IChangeEmailProps;
  contact: IContactEmailProps;
  terms: ITermsEmailProps;
  blocked: IBlockedEmailProps;
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
