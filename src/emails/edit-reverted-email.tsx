import { Text } from "@react-email/components";

import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import ActionButton from "./components/action-button";
import EmailLayout from "./components/email-layout";
import type { IEditRevertedEmailProps } from "./email-types";

export function subject({ locale, entryName }: IEditRevertedEmailProps) {
  return m.moderation_email_edit_reverted_subject({ entryName }, { locale });
}

function groupLabel(group: string, locale: AppLocale): string {
  const options = { locale };
  if (group === "name") return m.moderation_email_edit_group_name({}, options);
  if (group === "description")
    return m.moderation_email_edit_group_description({}, options);
  if (group === "offering")
    return m.moderation_email_edit_group_offering({}, options);
  if (group === "website")
    return m.moderation_email_edit_group_website({}, options);
  if (group === "contact")
    return m.moderation_email_edit_group_contact({}, options);
  if (group === "visibility")
    return m.moderation_email_edit_group_visibility({}, options);
  if (group === "images")
    return m.moderation_email_edit_group_images({}, options);
  if (group === "location")
    return m.moderation_email_edit_group_location({}, options);
  return m.moderation_email_edit_group_other({}, options);
}

export default function EditRevertedEmail(props: IEditRevertedEmailProps) {
  const { locale, entryName, fieldGroups, reason, link } = props;
  return (
    <EmailLayout
      locale={locale}
      footer="account"
      preview={m.moderation_email_edit_reverted_preheader({}, { locale })}
    >
      <Text>{m.email_greeting({}, { locale })}</Text>
      <Text>
        {m.moderation_email_edit_reverted_body_1(
          { entryName, siteName: site.name },
          { locale },
        )}
      </Text>
      <Text>
        {m.moderation_email_edit_reverted_fields(
          { fields: fieldGroups.map((g) => groupLabel(g, locale)).join(", ") },
          { locale },
        )}
        <br />
        {m.moderation_email_edit_reverted_reason({ reason }, { locale })}
      </Text>
      <Text>{m.moderation_email_edit_reverted_body_2({}, { locale })}</Text>
      <ActionButton
        href={link}
        locale={locale}
        label={m.moderation_email_edit_reverted_button({}, { locale })}
      />
    </EmailLayout>
  );
}

EditRevertedEmail.PreviewProps = {
  locale: "en",
  entryName: "Example Studio",
  fieldGroups: ["description", "contact"],
  reason: "The description contained advertising.",
  link: `${site.origin}/account/listing`,
} satisfies IEditRevertedEmailProps;
