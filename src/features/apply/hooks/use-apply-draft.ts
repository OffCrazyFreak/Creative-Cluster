import { useEffect, useRef } from "react";

import { APPLY_DRAFT_STORAGE_KEY } from "@/constants/apply";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { emptyApplication } from "../apply-defaults";
import type { ApplicationFormValues } from "../apply-schemas";

// Consent is never part of a draft: it must be given again at the moment of sending.
const DRAFT_MAX_AGE_MS = 30 * 86_400_000;
const TEXT_FIELDS = [
  "name",
  "contactName",
  "contactEmail",
  "contactPhone",
  "website",
];

interface IStoredDraft {
  savedAt: number;
  values: Record<string, unknown>;
}

// A stale or hand-edited draft must not reach the editor in a shape it cannot render.
function isUsable(values: Record<string, unknown>): boolean {
  const description = values.description as { type?: unknown } | undefined;
  const location = values.location as { countryCode?: unknown } | undefined;
  return (
    TEXT_FIELDS.every((key) => typeof values[key] === "string") &&
    description?.type === "doc" &&
    typeof location === "object" &&
    location !== null &&
    (values.kind === "organization" || values.kind === "person")
  );
}

export function readApplyDraft(): Partial<ApplicationFormValues> | null {
  try {
    const raw = localStorage.getItem(APPLY_DRAFT_STORAGE_KEY);
    const stored = (raw ? JSON.parse(raw) : null) as IStoredDraft | null;
    if (!stored || Date.now() - stored.savedAt > DRAFT_MAX_AGE_MS) return null;
    if (!isUsable(stored.values)) return null;
    return {
      ...(stored.values as Partial<ApplicationFormValues>),
      consent: false,
      ageConfirmed: false,
    };
  } catch {
    return null;
  }
}

export function clearApplyDraft() {
  try {
    localStorage.removeItem(APPLY_DRAFT_STORAGE_KEY);
  } catch {
    // Storage can be blocked; the form still works without a draft.
  }
}

// An untouched form is not worth keeping, and saving it right after "discard" would bring the draft back.
function isPristine(values: ApplicationFormValues): boolean {
  const blank = emptyApplication();
  return (
    JSON.stringify({ ...values, consent: false, ageConfirmed: false }) ===
    JSON.stringify(blank)
  );
}

export function useApplyDraftSaver(
  values: ApplicationFormValues,
  enabled: boolean,
) {
  const debounced = useDebouncedValue(values, 600);
  // The form as loaded needs no saving until something changes.
  const initial = useRef(values);

  useEffect(() => {
    if (!enabled || debounced === initial.current || isPristine(debounced))
      return;
    const { consent: _consent, ageConfirmed: _age, ...rest } = debounced;
    try {
      localStorage.setItem(
        APPLY_DRAFT_STORAGE_KEY,
        JSON.stringify({ savedAt: Date.now(), values: rest }),
      );
    } catch {
      // Storage can be blocked or full; losing the draft is acceptable.
    }
  }, [debounced, enabled]);
}
