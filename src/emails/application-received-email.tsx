import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import EmailLayout from "./components/email-layout";
import type { IApplicationReceivedEmailProps } from "./email-types";

export function subject({ locale }: IApplicationReceivedEmailProps) {
  return m.email_application_received_subject({}, { locale });
}

export default function ApplicationReceivedEmail(
  props: IApplicationReceivedEmailProps,
) {
  const { locale, entryName } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="requested"
      preview={m.email_application_received_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_application_received_body_1(
          { entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <Text>{m.email_application_received_body_2({}, { locale })}</Text>
    </EmailLayout>
  );
}

ApplicationReceivedEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
} satisfies IApplicationReceivedEmailProps;
