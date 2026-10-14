import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IVerifyEmailProps } from "./email-types";
import { expiryText } from "./expiry-text";

export function subject({ locale }: IVerifyEmailProps) {
  return m.email_verify_subject({}, { locale });
}

export default function VerifyEmail(props: IVerifyEmailProps) {
  const { locale, link, expiry, entryName } = props;
  const body = entryName
    ? m.email_verify_body_entry({ entryName, siteName: site.name }, { locale })
    : m.email_verify_body({ siteName: site.name }, { locale });
  return (
    <EmailLayout
      locale={locale}
      footer="requested"
      preview={m.email_verify_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>{body}</Text>
      <Text>
        {m.email_verify_expiry(
          { expiry: expiryText(expiry, locale) },
          { locale },
        )}
      </Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_verify_button({}, { locale })}
      />
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  locale: "en",
  link: `${site.origin}/api/auth/verify-email?token=preview-token`,
  expiry: "hour",
  entryName: "Example Studio",
} satisfies IVerifyEmailProps;
