import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IOpportunityApprovedEmailProps } from "./email-types";

export function subject({ locale }: IOpportunityApprovedEmailProps) {
  return m.email_opportunity_approved_subject({}, { locale });
}

export default function OpportunityApprovedEmail(
  props: IOpportunityApprovedEmailProps,
) {
  const { locale, entryName, opportunityTitle, expiresAt, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.email_opportunity_approved_preheader(
        { opportunityTitle },
        { locale },
      )}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_opportunity_approved_body_1(
          { opportunityTitle, entryName, siteName: site.name, expiresAt },
          { locale },
        )}
      </Text>
      <Text>{m.email_opportunity_approved_body_2({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_opportunity_approved_button({}, { locale })}
      />
    </EmailLayout>
  );
}

OpportunityApprovedEmail.PreviewProps = {
  locale: "en",
  entryName: "Studio Example",
  opportunityTitle: "Looking for a print partner",
  expiresAt: "1 December 2026",
  link: `${site.origin}/opportunities/preview-id`,
} satisfies IOpportunityApprovedEmailProps;
