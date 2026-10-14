import { useStore } from "@tanstack/react-form";
import { useEffect, useRef } from "react";

import { withForm } from "@/components/custom/form/app-form";
import { errorMessage } from "@/components/custom/form/error-message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { EntryKind } from "@/constants/entry";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import { fieldLabel, focusField } from "../listing-field-labels";

interface IProblem {
  name: string;
  message: string;
}

// The browser cannot show every message at once on a long form, so a failed submit lists them at the top.
const ErrorSummary = withForm({
  defaultValues: emptyListingValues(),
  props: {} as { kind: EntryKind },
  render: function Render({ form, kind }) {
    const heading = useRef<HTMLDivElement>(null);
    const attempts = useStore(form.store, (s) => s.submissionAttempts);
    const meta = useStore(
      form.store,
      (s) => s.fieldMeta as Record<string, { errors: unknown[] } | undefined>,
    );

    useEffect(() => {
      // Only a new submit attempt may move focus; later revalidation while typing must not.
      if (attempts > 0 && !form.state.isValid) heading.current?.focus();
    }, [attempts, form]);

    const problems: IProblem[] = Object.entries(meta).flatMap(([name, field]) =>
      (field?.errors ?? []).flatMap((error) => {
        const message = errorMessage(error);
        return message ? [{ name, message }] : [];
      }),
    );
    if (attempts === 0 || problems.length === 0) return null;

    return (
      <Alert variant="destructive" ref={heading} tabIndex={-1}>
        <AlertTitle>{m.account_summary_title()}</AlertTitle>
        <AlertDescription>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {problems.map(({ name, message }) => (
              <li key={`${name}:${message}`}>
                <a
                  href={`#${name}`}
                  className="underline"
                  onClick={(event) => {
                    event.preventDefault();
                    focusField(
                      name,
                      message === m.account_error_location_country(),
                    );
                  }}
                >
                  {fieldLabel(name, kind)}: {message}
                </a>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  },
});

export default ErrorSummary;
