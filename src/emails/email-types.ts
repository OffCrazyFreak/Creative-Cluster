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

export interface IApplicationReceivedEmailProps extends IBaseEmailProps {
  entryName: string;
}

export interface IEmailPropsMap {
  invite: IInviteEmailProps;
  claim: IClaimEmailProps;
  verify: IVerifyEmailProps;
  reset: IResetEmailProps;
  change: IChangeEmailProps;
  application_received: IApplicationReceivedEmailProps;
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
