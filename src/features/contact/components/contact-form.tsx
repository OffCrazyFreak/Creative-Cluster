import { useState } from "react";

import { useAppForm } from "@/components/custom/form/app-form";
import TurnstileField from "@/components/custom/form/turnstile-field";
import { FieldDescription, FieldGroup } from "@/components/ui/field";
import FormError from "@/features/auth/components/form-error";
import { track } from "@/lib/analytics/track";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";

import { sendContactMessageFn } from "../contact.functions";
import { contactFieldsSchema } from "../contact-schemas";
import ContactHoneypot from "./contact-honeypot";

interface IContactFormProps {
  entryId: string;
  defaultMessage?: string;
  onSent: () => void;
}

export default function ContactForm({
  entryId,
  defaultMessage = "",
  onSent,
}: IContactFormProps) {
  const [openedAt] = useState(() => performance.now());
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const [trap, setTrap] = useState("");
  const [error, setError] = useState<string | null>(null);

  // A Turnstile token works once, so every attempt needs a fresh widget.
  function failWith(message: string) {
    setError(message);
    setToken(null);
    setWidgetKey((key) => key + 1);
  }

  const form = useAppForm({
    defaultValues: { name: "", email: "", message: defaultMessage },
    validators: { onChange: contactFieldsSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      if (!token) return setError(m.contact_error_wait());
      try {
        const result = await sendContactMessageFn({
          data: {
            ...value,
            entryId,
            locale: getLocale(),
            turnstileToken: token,
            fax: trap,
            filledMs: Math.round(performance.now() - openedAt),
          },
        });
        if (result.status === "captcha")
          return failWith(m.contact_error_captcha());
        if (result.status === "limited")
          return failWith(m.contact_error_limit());
        if (result.status === "unavailable")
          return failWith(m.contact_error_unavailable());
        if (result.kind) track("contact_sent", { kind: result.kind });
        onSent();
      } catch {
        failWith(m.contact_error_failed());
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label={m.contact_field_name()}
              autoComplete="name"
            />
          )}
        </form.AppField>
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label={m.contact_field_email()}
              type="email"
              autoComplete="email"
            />
          )}
        </form.AppField>
        <form.AppField name="message">
          {(field) => (
            <field.TextAreaField
              label={m.contact_field_message()}
              description={m.contact_message_hint()}
              rows={6}
            />
          )}
        </form.AppField>
      </FieldGroup>
      <ContactHoneypot value={trap} onChange={setTrap} />
      <TurnstileField
        key={widgetKey}
        onToken={(next) => {
          setToken(next);
          setError(null);
        }}
        onExpire={() => setToken(null)}
      />
      <FieldDescription>{m.contact_privacy()}</FieldDescription>
      <FormError message={error} />
      <form.AppForm>
        <form.SubmitButton>{m.contact_submit()}</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
