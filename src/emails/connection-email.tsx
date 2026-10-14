import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { kindLabel } from "@/features/connections/connection-kind-label";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IConnectionEmailProps } from "./email-types";

export function subject({
  locale,
  proposerName,
  entryName,
}: IConnectionEmailProps) {
  return m.email_connection_subject({ proposerName, entryName }, { locale });
}

export default function ConnectionEmail(props: IConnectionEmailProps) {
  const { locale, proposerName, entryName, kind, year, note, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.email_connection_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.email_connection_intro(
          { proposerName, entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <Text>
        {m.email_connection_kind({ kind: kindLabel(kind, locale) }, { locale })}
        {year ? (
          <>
            <br />
            {m.email_connection_year({ year }, { locale })}
          </>
        ) : null}
        {note ? (
          <>
            <br />
            {m.email_connection_note({ note }, { locale })}
          </>
        ) : null}
      </Text>
      <Text>{m.email_connection_visibility({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.email_connection_button({}, { locale })}
      />
    </EmailLayout>
  );
}

ConnectionEmail.PreviewProps = {
  locale: "en",
  proposerName: "Example Studio",
  entryName: "Example Workshop",
  kind: "collaborated",
  year: 2025,
  note: "A joint exhibition.",
  link: `${site.origin}/account/connections`,
} satisfies IConnectionEmailProps;
