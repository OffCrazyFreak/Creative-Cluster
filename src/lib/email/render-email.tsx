import { render, toPlainText } from "@react-email/render";

import type { EmailTemplateName } from "@/constants/email";
import { EMAIL_TEMPLATES } from "@/emails/email-templates";
import type { EmailPropsOf } from "@/emails/email-types";

export async function renderEmail<T extends EmailTemplateName>(
  template: T,
  props: EmailPropsOf<T>,
) {
  const entry = EMAIL_TEMPLATES[template] as {
    element: (props: EmailPropsOf<T>) => React.ReactElement;
    subject: (props: EmailPropsOf<T>) => string;
  };
  const react = entry.element(props);
  const html = await render(react);
  return {
    react,
    html,
    text: toPlainText(html),
    subject: entry.subject(props),
  };
}
