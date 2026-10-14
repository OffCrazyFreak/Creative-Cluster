import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IClaimReminderEmailProps } from "./email-types";

export function subject({ locale, entryName }: IClaimReminderEmailProps) {
  return m.email_claim_reminder_subject(
    { entryName, siteName: site.name },
    { locale },
  );
}

// Prepared only: claims:send queues it once, about ten days after the first claim email.
export default function ClaimReminderEmail(props: IClaimReminderEmailProps) {
  const { locale, entryName, link, removeLink, expiryDate } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="none"
      preview={m.email_claim_reminder_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_claim_reminder_intro(
          { entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <Text>{m.email_claim_reminder_body({ expiryDate }, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_claim_button({}, { locale })}
      />
      <ActionButton
        href={removeLink}
        locale={locale}
        label={m.email_claim_remove_button({}, { locale })}
      />
      <Text>
        {m.email_claim_reminder_closing(
          {
            privacyLink: `${site.origin}/privacy`,
            contactEmail: site.contactEmail,
            controllerName: site.legal.name,
          },
          { locale },
        )}
      </Text>
    </EmailLayout>
  );
}

ClaimReminderEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  link: `${site.origin}/claim/preview-token`,
  removeLink: `${site.origin}/claim/preview-token/remove`,
  expiryDate: "1 January 2030",
} satisfies IClaimReminderEmailProps;
