import { Text } from "@react-email/components";

import { ERASURE_GRACE_DAYS } from "@/constants/lifecycle";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IErasureScheduledEmailProps } from "./email-types";

export function subject({ locale }: IErasureScheduledEmailProps) {
  return m.moderation_email_erasure_scheduled_subject({}, { locale });
}

export default function ErasureScheduledEmail(
  props: IErasureScheduledEmailProps,
) {
  const { locale, entryName, deleteDate, link } = props;
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(deleteDate));
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.moderation_email_erasure_scheduled_preheader(
        { days: ERASURE_GRACE_DAYS },
        { locale },
      )}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {entryName
          ? m.moderation_email_erasure_scheduled_body_entry(
              { entryName, siteName: site.name, deleteDate: date },
              { locale },
            )
          : m.moderation_email_erasure_scheduled_body_account(
              { siteName: site.name, deleteDate: date },
              { locale },
            )}
      </Text>
      <Text>{m.moderation_email_erasure_scheduled_what({}, { locale })}</Text>
      <Text>{m.moderation_email_erasure_scheduled_cancel({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.moderation_email_erasure_scheduled_button({}, { locale })}
      />
    </EmailLayout>
  );
}

ErasureScheduledEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  deleteDate: "2026-11-01T00:00:00.000Z",
  link: `${site.origin}/account/data`,
} satisfies IErasureScheduledEmailProps;
