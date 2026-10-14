import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import EmailLayout from "./components/email-layout";
import type { IBlockedEmailProps } from "./email-types";

export function subject({ locale }: IBlockedEmailProps) {
  return m.notices_blocked_subject({ siteName: site.name }, { locale });
}

// Statement of reasons for a blocked account; the reason is admin-typed text, escaped by React.
export default function BlockedEmail(props: IBlockedEmailProps) {
  const { locale, name, reason } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.notices_blocked_preheader({}, { locale })}
    >
      <Text>
        {m.notices_blocked_body(
          {
            name,
            siteName: site.name,
            reason,
            contactEmail: site.contactEmail,
          },
          { locale },
        )}
      </Text>
    </EmailLayout>
  );
}

BlockedEmail.PreviewProps = {
  locale: "en",
  name: "Alex Example",
  reason: "Repeated spam in listing text.",
} satisfies IBlockedEmailProps;
