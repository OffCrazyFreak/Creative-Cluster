import { Text } from "@react-email/components";

import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IContactEmailProps } from "./email-types";

export function subject({ locale, entryName }: IContactEmailProps) {
  return m.contact_email_subject(
    { entryName, siteName: site.name },
    { locale },
  );
}

// The visitor's text is a React child, so it is escaped and never parsed as HTML.
export default function ContactEmail(props: IContactEmailProps) {
  const { locale, entryName, senderName, senderEmail, messageText, link } =
    props;
  return (
    <EmailLayout
      locale={locale}
      footer="none"
      preview={m.contact_email_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.contact_email_intro({ entryName, siteName: site.name }, { locale })}
      </Text>
      <Text>
        {m.contact_email_sender({ senderName, senderEmail }, { locale })}
      </Text>
      <Text style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {messageText}
      </Text>
      <Text>{m.contact_email_reply_note({}, { locale })}</Text>
      <Text>{m.contact_email_report_prompt({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.contact_email_report_button({}, { locale })}
      />
      <Text style={{ fontSize: 12 }}>
        {m.contact_email_footer(
          {
            siteName: site.name,
            entryName,
            contactEmail: site.contactEmail,
            controllerName: site.legal.name,
          },
          { locale },
        )}
      </Text>
    </EmailLayout>
  );
}

ContactEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  senderName: "Alex Visitor",
  senderEmail: "visitor@example.org",
  messageText: "Hello, we would like to talk about a joint workshop.",
  link: `mailto:${site.contactEmail}?subject=Report`,
} satisfies IContactEmailProps;
