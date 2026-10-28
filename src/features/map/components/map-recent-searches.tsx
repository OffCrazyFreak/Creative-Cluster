import { History } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { useRecentSearches } from "../hooks/use-recent-searches";

interface IMapRecentSearchesProps {
  query: string;
  hasResults: boolean;
  onPick: (query: string) => void;
}

// Last searches on this device, offered while the search field is empty.
export default function MapRecentSearches({
  query,
  hasResults,
  onPick,
}: IMapRecentSearchesProps) {
  const { recent, clear } = useRecentSearches(query, hasResults);
  const [cleared, setCleared] = useState(false);
  const searches = query ? [] : recent;

  return (
    <>
      <p role="status" className="sr-only">
        {cleared ? m.map_recent_cleared() : null}
      </p>
      {searches.length > 0 ? (
        <div
          role="group"
          aria-label={m.map_recent_label()}
          className="flex flex-wrap items-center gap-2"
        >
          <History className="size-4" aria-hidden="true" />
          {searches.map((search) => (
            <Button
              key={search}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onPick(search)}
              className="rounded-full"
            >
              {search}
            </Button>
          ))}
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-label={m.map_recent_clear_label()}
            onClick={() => {
              clear();
              setCleared(true);
            }}
          >
            {m.map_recent_clear()}
          </Button>
        </div>
      ) : null}
    </>
  );
}
