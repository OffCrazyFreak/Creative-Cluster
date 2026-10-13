import { queryOptions } from "@tanstack/react-query";

import {
  dguAttributionFn,
  searchAddressFn,
  suggestAddressFn,
} from "./location.functions";
import { loadTowns } from "./town-search";

export const MIN_QUERY_LENGTH = 3;

// TanStack Query passes its abort signal, so a stale keystroke cancels its request.
export function suggestQueryOptions(text: string, countryCode?: string) {
  return queryOptions({
    queryKey: ["location", "suggest", countryCode ?? "", text],
    queryFn: ({ signal }) =>
      suggestAddressFn({ data: { text, countryCode }, signal }),
    enabled: text.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function searchQueryOptions(text: string, countryCode?: string) {
  return queryOptions({
    queryKey: ["location", "search", countryCode ?? "", text],
    queryFn: ({ signal }) =>
      searchAddressFn({ data: { text, countryCode }, signal }),
    enabled: text.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function dguAttributionQueryOptions() {
  return queryOptions({
    queryKey: ["location", "dgu-attribution"],
    queryFn: () => dguAttributionFn(),
    staleTime: 60 * 60_000,
  });
}

export function townsQueryOptions(countryCode: string) {
  return queryOptions({
    queryKey: ["location", "towns", countryCode],
    queryFn: ({ signal }) => loadTowns(countryCode, signal),
    staleTime: Infinity,
  });
}
