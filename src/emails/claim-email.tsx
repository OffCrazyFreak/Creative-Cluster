import { Heading, Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IClaimEmailProps } from "./email-types";
import { expiryText } from "./expiry-text";

export function subject({ locale, entryName }: IClaimEmailProps) {
  return m.email_claim_subject({ entryName, siteName: site.name }, { locale });
}

// Prepared only: nothing enqueues this template until the owner gives the go-ahead.
export default function ClaimEmail(props: IClaimEmailProps) {
  const { locale, entryName, link, removeLink, expiry } = props;
  const { importSource, archiveDate } = props;
  const controllerName = site.legal.name;
  return (
    <EmailLayout
      locale={locale}
      footer="none"
      preview={m.email_claim_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_claim_intro(
          { entryName, siteName: site.name, siteUrl: site.origin },
          { locale },
        )}
      </Text>
      <Heading as="h2">{m.email_claim_source_title({}, { locale })}</Heading>
      <Text>{m.email_claim_source_body({ importSource }, { locale })}</Text>
      <Heading as="h2">{m.email_claim_changes_title({}, { locale })}</Heading>
      <Text>{m.email_claim_changes_body({}, { locale })}</Text>
      <Heading as="h2">{m.email_claim_actions_title({}, { locale })}</Heading>
      <Text>
        {m.email_claim_actions_body(
          { expiry: expiryText(expiry, locale) },
          { locale },
        )}
      </Text>
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
      <Heading as="h2">{m.email_claim_nothing_title({}, { locale })}</Heading>
      <Text>{m.email_claim_nothing_body({ archiveDate }, { locale })}</Text>
      <Heading as="h2">{m.email_claim_notice_title({}, { locale })}</Heading>
      <Text>
        {m.email_claim_notice_body(
          {
            controllerName,
            siteName: site.name,
            importSource,
            privacyLink: `${site.origin}/privacy`,
            contactEmail: site.contactEmail,
          },
          { locale },
        )}
      </Text>
      <Text>{m.email_claim_closing({}, { locale })}</Text>
    </EmailLayout>
  );
}

ClaimEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  link: `${site.origin}/claim/preview-token`,
  removeLink: `${site.origin}/claim/preview-token/remove`,
  expiry: "days30",
  importSource: "[[GAP: import source and year]]",
  archiveDate: "[[GAP: archive date]]",
} satisfies IClaimEmailProps;
