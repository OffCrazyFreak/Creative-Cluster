import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import OpportunityReason from "./components/opportunity-reason";
import type { IOpportunityRejectedEmailProps } from "./email-types";

export function subject({ locale }: IOpportunityRejectedEmailProps) {
  return m.email_opportunity_rejected_subject({}, { locale });
}

export default function OpportunityRejectedEmail(
  props: IOpportunityRejectedEmailProps,
) {
  const { locale, entryName, opportunityTitle, reasonCode, note, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.email_opportunity_rejected_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_opportunity_rejected_body_1(
          { opportunityTitle, entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <OpportunityReason
        locale={locale}
        title={m.email_opportunity_rejected_reason_title({}, { locale })}
        reasonCode={reasonCode}
        note={note}
      />
      <Text>{m.email_opportunity_rejected_body_2({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_opportunity_rejected_button({}, { locale })}
      />
    </EmailLayout>
  );
}

OpportunityRejectedEmail.PreviewProps = {
  locale: "en",
  entryName: "Studio Example",
  opportunityTitle: "Looking for a print partner",
  reasonCode: "incomplete",
  note: "Please say which city you work in.",
  link: `${site.origin}/account/opportunities`,
} satisfies IOpportunityRejectedEmailProps;
