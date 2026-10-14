import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IResetEmailProps } from "./email-types";
import { expiryText } from "./expiry-text";

export function subject({ locale }: IResetEmailProps) {
  return m.email_reset_subject({}, { locale });
}

export default function ResetEmail(props: IResetEmailProps) {
  const { locale, link, expiry } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="requested"
      preview={m.email_reset_preheader({ siteName: site.name }, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_reset_body_1(
          { siteName: site.name, expiry: expiryText(expiry, locale) },
          { locale },
        )}
      </Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_reset_button({}, { locale })}
      />
      <Text>{m.email_reset_body_2({}, { locale })}</Text>
      <Text>{m.email_reset_tip({}, { locale })}</Text>
    </EmailLayout>
  );
}

ResetEmail.PreviewProps = {
  locale: "en",
  link: `${site.origin}/reset-password?token=preview-token`,
  expiry: "hour",
} satisfies IResetEmailProps;
