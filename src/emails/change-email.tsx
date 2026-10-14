import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IChangeEmailProps } from "./email-types";
import { expiryText } from "./expiry-text";

export function subject({ locale }: IChangeEmailProps) {
  return m.email_change_subject({}, { locale });
}

export default function ChangeEmail(props: IChangeEmailProps) {
  const { locale, link, expiry } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="requested"
      preview={m.email_change_preheader({ siteName: site.name }, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_change_body_1(
          { siteName: site.name, expiry: expiryText(expiry, locale) },
          { locale },
        )}
      </Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_change_button({}, { locale })}
      />
      <Text>{m.email_change_body_2({}, { locale })}</Text>
    </EmailLayout>
  );
}

ChangeEmail.PreviewProps = {
  locale: "en",
  link: `${site.origin}/api/auth/verify-email?token=preview-token`,
  expiry: "hour",
} satisfies IChangeEmailProps;
