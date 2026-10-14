import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

import {
  MIN_QUERY_LENGTH,
  searchQueryOptions,
  suggestQueryOptions,
} from "../location-queries";

export const DEBOUNCE_MS = 350;

// Typing asks for suggestions after a pause; pressing Search asks the submit-only providers once.
export function useAddressSearch(inputValue: string, countryCode?: string) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  // A saved address that opens in an edit form counts as picked: no lookup until the user types.
  const [picked, setPicked] = useState<string | null>(inputValue.trim());
  const debounced = useDebouncedValue(inputValue.trim(), DEBOUNCE_MS);
  const typing = debounced === picked ? "" : debounced;

  const suggest = useQuery({
    ...suggestQueryOptions(typing, countryCode ?? ""),
    enabled: Boolean(countryCode) && typing.length >= MIN_QUERY_LENGTH,
  });
  const search = useQuery({
    ...searchQueryOptions(submitted ?? "", countryCode ?? ""),
    enabled:
      Boolean(countryCode) && (submitted?.length ?? 0) >= MIN_QUERY_LENGTH,
  });

  const showingSearch = submitted !== null && submitted === inputValue.trim();
  const active = showingSearch ? search : suggest;
  return {
    hits: active.data?.hits ?? [],
    degraded: active.data?.degraded ?? false,
    failed: active.isError,
    loading: active.isFetching,
    settled: active.isSuccess,
    runSearch: () => setSubmitted(inputValue.trim()),
    markPicked: (text: string) => {
      setPicked(text);
      setSubmitted(null);
    },
  };
}
