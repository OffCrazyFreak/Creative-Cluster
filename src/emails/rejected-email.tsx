import { Heading, Text } from "@react-email/components";

import type { ReasonCode } from "@/constants/moderation";
import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IRejectedEmailProps } from "./email-types";

export function subject({ locale }: IRejectedEmailProps) {
  return m.email_rejected_subject({}, { locale });
}

function reasonText(
  code: ReasonCode,
  note: string | null,
  locale: AppLocale,
): string {
  const values = {
    siteName: site.name,
    claimHint: `${site.origin}/directory`,
    aboutLink: `${site.origin}/about`,
    note: note ?? "",
  };
  const options = { locale };
  if (code === "duplicate")
    return m.email_rejected_reason_duplicate(values, options);
  if (code === "out_of_scope")
    return m.email_rejected_reason_out_of_scope(values, options);
  if (code === "incomplete")
    return m.email_rejected_reason_incomplete(values, options);
  if (code === "unverifiable")
    return m.email_rejected_reason_unverifiable(values, options);
  return m.email_rejected_reason_other(values, options);
}

export default function RejectedEmail(props: IRejectedEmailProps) {
  const { locale, entryName, link, reasonCode, note } = props;
  // For "other" the note already is the reason, so it is not repeated below.
  const extraNote = reasonCode === "other" ? null : note;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.email_rejected_preheader({ entryName }, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_rejected_body_1(
          { entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <Heading as="h2">{m.email_rejected_reason_title({}, { locale })}</Heading>
      <Text>{reasonText(reasonCode, note, locale)}</Text>
      {extraNote && <Text>{extraNote}</Text>}
      <Text>{m.email_rejected_body_2({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_rejected_button({}, { locale })}
      />
    </EmailLayout>
  );
}

RejectedEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  link: `${site.origin}/apply?resubmit=preview-token`,
  reasonCode: "incomplete",
  note: "Please add a website.",
} satisfies IRejectedEmailProps;
