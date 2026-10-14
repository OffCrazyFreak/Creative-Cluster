import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import DigestList from "./components/digest-list";
import EmailLayout from "./components/email-layout";
import type { IReportDigestEmailProps } from "./email-types";

export function subject({ locale, count }: IReportDigestEmailProps) {
  return m.email_report_digest_subject({ count }, { locale });
}

export default function ReportDigestEmail(props: IReportDigestEmailProps) {
  const { locale, count, items, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.email_report_digest_preheader({ count }, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>{m.email_report_digest_body({ count }, { locale })}</Text>
      <DigestList items={items} />
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_digest_button({}, { locale })}
      />
    </EmailLayout>
  );
}

ReportDigestEmail.PreviewProps = {
  locale: "en",
  count: 1,
  items: [{ name: "Example Studio", detail: "spam", ageDays: 0 }],
  link: `${site.origin}/admin`,
} satisfies IReportDigestEmailProps;
