import { useState } from "react";

// State that forgets itself when the signature changes (for example when the filters change).
export function useSignatureState<T>(signature: string) {
  const [state, setState] = useState<{ signature: string; value: T } | null>(
    null,
  );
  const value = state?.signature === signature ? state.value : null;
  function set(next: T | null) {
    setState(next === null ? null : { signature, value: next });
  }
  return [value, set] as const;
}
