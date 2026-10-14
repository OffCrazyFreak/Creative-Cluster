import { useStore } from "@tanstack/react-form";
import { useEffect, useState } from "react";

import { useAppForm } from "@/components/custom/form/app-form";
import TurnstileField from "@/components/custom/form/turnstile-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { emptyLocation } from "@/features/location";
import FormError from "@/features/auth/components/form-error";
import { track } from "@/lib/analytics/track";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { defaultCountry, emptyApplication } from "../apply-defaults";
import {
  applicationSchema,
  type ApplicationFormValues,
  type SubmitApplicationResult,
} from "../apply-schemas";
import { submitApplicationFn } from "../apply.functions";
import { clearApplyDraft, useApplyDraftSaver } from "../hooks/use-apply-draft";
import { AboutSection } from "./about-section";
import { ConsentFields } from "./consent-fields";
import { ContactSection } from "./contact-section";
import { PlaceSection } from "./place-section";

interface IApplyFormProps {
  initial?: ApplicationFormValues;
  draftRestored?: boolean;
  resubmitToken?: string;
  onSent: (result: SubmitApplicationResult, email: string) => void;
}

function errorKey(result: SubmitApplicationResult): string | null {
  if (result.status === "captcha") return m.apply_error_captcha();
  if (result.status === "limited") return m.apply_error_limit();
  if (result.status === "expired") return m.apply_error_expired();
  return null;
}

export default function ApplyForm({
  initial,
  draftRestored = false,
  resubmitToken,
  onSent,
}: IApplyFormProps) {
  const [startedAt] = useState(() => Date.now());
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRestored, setShowRestored] = useState(draftRestored);

  useEffect(() => {
    track("apply_started", { kind: initial?.kind ?? emptyApplication().kind });
  }, [initial?.kind]);

  const form = useAppForm({
    defaultValues: initial ?? emptyApplication(),
    validators: { onChange: applicationSchema },
    listeners: {
      // A town pick and an address are different shapes; the old value is wrong for the new kind.
      onChange: ({ formApi, fieldApi }) => {
        if (fieldApi.name === "kind")
          formApi.setFieldValue(
            "location",
            emptyLocation(defaultCountry() ?? null),
          );
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);
      if (!token) {
        setError(m.apply_error_wait());
        return;
      }
      try {
        const result = await submitApplicationFn({
          data: {
            application: value,
            locale: getLocale(),
            turnstileToken: token,
            nickname: honeypot,
            startedAt,
            resubmitToken,
          },
        });
        const failure = errorKey(result);
        if (failure) {
          setError(failure);
          // A Turnstile token works once, so every attempt needs a fresh widget.
          setToken(null);
          setWidgetKey((key) => key + 1);
          return;
        }
        clearApplyDraft();
        track("apply_sent", { kind: value.kind });
        onSent(result, value.contactEmail);
      } catch {
        setError(m.apply_error_generic());
        setToken(null);
        setWidgetKey((key) => key + 1);
      }
    },
  });

  const values = useStore(form.store, (state) => state.values);
  useApplyDraftSaver(values, !resubmitToken);

  return (
    <form
      className="flex flex-col gap-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {showRestored && (
        <p className="flex flex-wrap items-center gap-2 text-sm" role="status">
          {m.apply_draft_restored()}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              clearApplyDraft();
              setShowRestored(false);
              form.reset(emptyApplication());
            }}
          >
            {m.apply_draft_discard()}
          </Button>
        </p>
      )}
      <FieldGroup>
        <AboutSection form={form} />
        <ContactSection form={form} />
        <PlaceSection form={form} />
        <ConsentFields form={form} />
      </FieldGroup>
      <div aria-hidden="true" className="sr-only">
        <input
          name="fax"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
      <TurnstileField
        key={widgetKey}
        onToken={setToken}
        onExpire={() => setToken(null)}
      />
      <FormError message={error} />
      <form.AppForm>
        <form.SubmitButton>{m.apply_submit()}</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
