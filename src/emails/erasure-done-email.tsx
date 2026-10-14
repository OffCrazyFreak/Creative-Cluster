import { Hr, Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import EmailLayout from "./components/email-layout";
import type { IErasureDoneEmailProps } from "./email-types";

export function subject({ locale }: IErasureDoneEmailProps) {
  return m.moderation_email_erasure_done_subject({}, { locale });
}

// The last mail an account gets. Its own footer says the address is not kept.
export default function ErasureDoneEmail(props: IErasureDoneEmailProps) {
  const { locale, entryName } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="none"
      preview={m.moderation_email_erasure_done_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {entryName
          ? m.moderation_email_erasure_done_body_entry(
              { entryName, siteName: site.name },
              { locale },
            )
          : m.moderation_email_erasure_done_body_account(
              { siteName: site.name },
              { locale },
            )}
      </Text>
      <Text>{m.moderation_email_erasure_done_last({}, { locale })}</Text>
      <Hr />
      <Text style={{ fontSize: 12 }}>
        {m.moderation_email_erasure_done_footer(
          {
            siteName: site.name,
            contactEmail: site.contactEmail,
            controllerName: site.legal.name,
          },
          { locale },
        )}
      </Text>
    </EmailLayout>
  );
}

ErasureDoneEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
} satisfies IErasureDoneEmailProps;
