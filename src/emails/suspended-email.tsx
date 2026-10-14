import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { ISuspendedEmailProps } from "./email-types";

export function subject({ locale, entryName }: ISuspendedEmailProps) {
  return m.moderation_email_suspended_subject({ entryName }, { locale });
}

export default function SuspendedEmail(props: ISuspendedEmailProps) {
  const { locale, entryName, reason, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.moderation_email_suspended_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.moderation_email_suspended_body_1(
          { entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <Text>{m.moderation_email_suspended_reason({ reason }, { locale })}</Text>
      <Text>{m.moderation_email_suspended_body_2({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.moderation_email_suspended_button({}, { locale })}
      />
    </EmailLayout>
  );
}

SuspendedEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  reason:
    "The listing advertises a product that is not related to the network.",
  link: `${site.origin}/account`,
} satisfies ISuspendedEmailProps;
