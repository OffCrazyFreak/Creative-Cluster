import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { ITermsEmailProps } from "./email-types";

export function subject({ locale }: ITermsEmailProps) {
  return m.notices_terms_subject({ siteName: site.name }, { locale });
}

export default function TermsEmail(props: ITermsEmailProps) {
  const { locale, name, summary, effectiveDate, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.notices_terms_preheader({ effectiveDate }, { locale })}
    >
      <Text>
        {m.notices_terms_body(
          { name, siteName: site.name, summary, effectiveDate },
          { locale },
        )}
      </Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.notices_terms_button({}, { locale })}
      />
    </EmailLayout>
  );
}

TermsEmail.PreviewProps = {
  locale: "en",
  name: "Alex Example",
  summary: "[[GAP: plain-language summary of the material change]]",
  effectiveDate: "1 January 2027",
  link: `${site.origin}/terms`,
} satisfies ITermsEmailProps;
