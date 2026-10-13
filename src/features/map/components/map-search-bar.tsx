import { useEffect, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { m } from "@/paraglide/messages";

import { useUpdateMapSearch } from "../hooks/use-update-map-search";
import { useMapFrame } from "../map-frame-context";
import MapFiltersMenu from "./map-filters-menu";

const DEBOUNCE_MS = 300;

export default function MapSearchBar() {
  const { search } = useMapFrame();
  const update = useUpdateMapSearch();
  // While typing, the draft wins; once the URL has caught up it is dropped again.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? search.q;

  useEffect(() => {
    if (draft === null) return;
    const timer = setTimeout(() => {
      void update({ q: draft }).then(() => setDraft(null));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, update]);

  return (
    <form
      role="search"
      aria-label={m.map_search_label()}
      onSubmit={(event) => {
        event.preventDefault();
        void update({ q: value }).then(() => setDraft(null));
      }}
    >
      <InputGroup>
        <InputGroupInput
          type="search"
          name="q"
          autoComplete="off"
          aria-label={m.map_search_label()}
          placeholder={m.map_search_placeholder()}
          value={value}
          onChange={(event) => setDraft(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <MapFiltersMenu />
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
