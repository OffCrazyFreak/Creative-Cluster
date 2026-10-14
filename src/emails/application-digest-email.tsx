import { Text } from "@react-email/components";

import { REVIEW_STALE_DAYS } from "@/constants/moderation";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import DigestList from "./components/digest-list";
import EmailLayout from "./components/email-layout";
import type { IApplicationDigestEmailProps } from "./email-types";

export function subject({ locale, count }: IApplicationDigestEmailProps) {
  return m.moderation_email_application_digest_subject({ count }, { locale });
}

export default function ApplicationDigestEmail(
  props: IApplicationDigestEmailProps,
) {
  const { locale, count, openTotal, oldestAgeDays, items, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.moderation_email_application_digest_preheader(
        { count, oldestAge: oldestAgeDays },
        { locale },
      )}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.moderation_email_application_digest_body(
          { count, openTotal, days: REVIEW_STALE_DAYS },
          { locale },
        )}
      </Text>
      <DigestList items={items} />
      <ActionButton
        href={link}
        locale={locale}
        label={m.moderation_email_digest_button({}, { locale })}
      />
    </EmailLayout>
  );
}

ApplicationDigestEmail.PreviewProps = {
  locale: "en",
  count: 2,
  openTotal: 5,
  oldestAgeDays: 4,
  items: [
    { name: "Example Studio", detail: "Organization, HR, 1 day", ageDays: 1 },
    { name: "Example Person", detail: "Person, HR, 4 days", ageDays: 4 },
  ],
  link: `${site.origin}/admin`,
} satisfies IApplicationDigestEmailProps;
