import { Heading, Text } from "@react-email/components";

import type { AppLocale } from "@/constants/locales";
import type { ReasonCode } from "@/constants/moderation";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

interface IOpportunityReasonProps {
  locale: AppLocale;
  title: string;
  reasonCode: ReasonCode;
  note: string | null;
}

function reasonText(code: ReasonCode, locale: AppLocale): string {
  const values = { siteName: site.name };
  if (code === "incomplete")
    return m.email_opportunity_reason_incomplete(values, { locale });
  if (code === "duplicate")
    return m.email_opportunity_reason_duplicate(values, { locale });
  if (code === "out_of_scope")
    return m.email_opportunity_reason_out_of_scope(values, { locale });
  if (code === "unverifiable")
    return m.email_opportunity_reason_unverifiable(values, { locale });
  if (code === "spam")
    return m.email_opportunity_reason_spam(values, { locale });
  return m.email_opportunity_reason_other(values, { locale });
}

// The admin's note is plain text and never part of a subject.
export default function OpportunityReason({
  locale,
  title,
  reasonCode,
  note,
}: IOpportunityReasonProps) {
  return (
    <>
      <Heading as="h2">{title}</Heading>
      <Text>{reasonText(reasonCode, locale)}</Text>
      {note ? (
        <Text>{m.email_opportunity_note({ note }, { locale })}</Text>
      ) : null}
    </>
  );
}
