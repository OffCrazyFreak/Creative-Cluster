import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import OpportunityReason from "./components/opportunity-reason";
import type { IOpportunityRemovedEmailProps } from "./email-types";

export function subject({
  locale,
  opportunityTitle,
}: IOpportunityRemovedEmailProps) {
  return m.email_opportunity_removed_subject({ opportunityTitle }, { locale });
}

// Statement of reasons required by the Digital Services Act when content is removed.
export default function OpportunityRemovedEmail(
  props: IOpportunityRemovedEmailProps,
) {
  const { locale, opportunityTitle, reasonCode, note, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.email_opportunity_removed_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_opportunity_removed_body_1(
          { opportunityTitle, siteName: site.name },
          { locale },
        )}
      </Text>
      <OpportunityReason
        locale={locale}
        title={m.email_opportunity_removed_reason_title({}, { locale })}
        reasonCode={reasonCode}
        note={note}
      />
      <Text>
        {m.email_opportunity_removed_body_2(
          { contactEmail: site.contactEmail },
          { locale },
        )}
      </Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_opportunity_removed_button({}, { locale })}
      />
    </EmailLayout>
  );
}

OpportunityRemovedEmail.PreviewProps = {
  locale: "en",
  opportunityTitle: "Looking for a print partner",
  reasonCode: "out_of_scope",
  note: null,
  link: `${site.origin}/account/opportunities`,
} satisfies IOpportunityRemovedEmailProps;
