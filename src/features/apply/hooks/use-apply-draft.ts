import { useEffect, useRef } from "react";

import { APPLY_DRAFT_STORAGE_KEY } from "@/constants/apply";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import type { ApplicationFormValues } from "../apply-schemas";

// Consent is never part of a draft: it must be given again at the moment of sending.
export function readApplyDraft(): Partial<ApplicationFormValues> | null {
  try {
    const raw = localStorage.getItem(APPLY_DRAFT_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return null;
    return { ...parsed, consent: false, ageConfirmed: false };
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

export function useApplyDraftSaver(
  values: ApplicationFormValues,
  enabled: boolean,
) {
  const debounced = useDebouncedValue(values, 600);
  // Until the person changes something, the value is still the form as loaded and needs no saving.
  const initial = useRef(values);

  useEffect(() => {
    if (!enabled || debounced === initial.current) return;
    const { consent: _consent, ageConfirmed: _age, ...rest } = debounced;
    try {
      localStorage.setItem(APPLY_DRAFT_STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // Storage can be blocked or full; losing the draft is acceptable.
    }
  }, [debounced, enabled]);
}
