import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IApprovedEmailProps } from "./email-types";
import { expiryText } from "./expiry-text";

export function subject({ locale, entryName }: IApprovedEmailProps) {
  return m.moderation_email_approved_subject({ entryName }, { locale });
}

export default function ApprovedEmail(props: IApprovedEmailProps) {
  const { locale, entryName, link, expiry, newAccount, needsPassword } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={
        needsPassword
          ? m.moderation_email_approved_preheader_new({}, { locale })
          : m.moderation_email_approved_preheader_existing({}, { locale })
      }
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.moderation_email_approved_body_1(
          { entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <Text>
        {newAccount
          ? m.moderation_email_approved_body_new(
              { expiry: expiryText(expiry, locale) },
              { locale },
            )
          : needsPassword
            ? m.moderation_email_approved_body_existing_setpassword(
                { expiry: expiryText(expiry, locale) },
                { locale },
              )
            : m.moderation_email_approved_body_existing({}, { locale })}
      </Text>
      <Text>{m.moderation_email_approved_body_2({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={
          needsPassword
            ? m.moderation_email_approved_button_new({}, { locale })
            : m.moderation_email_approved_button_existing({}, { locale })
        }
      />
    </EmailLayout>
  );
}

ApprovedEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  link: `${site.origin}/set-password?token=preview-token`,
  expiry: "days7",
  newAccount: true,
  needsPassword: true,
} satisfies IApprovedEmailProps;
