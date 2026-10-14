import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IInviteEmailProps } from "./email-types";
import { expiryText } from "./expiry-text";

export function subject({ locale }: IInviteEmailProps) {
  return m.email_invite_subject({ siteName: site.name }, { locale });
}

export default function InviteEmail(props: IInviteEmailProps) {
  const { locale, link, expiry } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.email_invite_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>{m.email_invite_body_1({ siteName: site.name }, { locale })}</Text>
      <Text>
        {m.email_invite_body_2(
          { expiry: expiryText(expiry, locale) },
          { locale },
        )}
      </Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_invite_button({}, { locale })}
      />
      <Text>{m.email_invite_body_3({}, { locale })}</Text>
    </EmailLayout>
  );
}

InviteEmail.PreviewProps = {
  locale: "en",
  link: `${site.origin}/set-password?token=preview-token`,
  expiry: "days7",
} satisfies IInviteEmailProps;
