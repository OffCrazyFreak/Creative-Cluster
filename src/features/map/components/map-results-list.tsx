import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { useHeldView } from "../hooks/use-held-view";
import { listGroups } from "../list-headings";
import { useMapFrame } from "../map-frame-context";
import { splitByView } from "../view-area";
import MapResultItem from "./map-result-item";
import MapViewPendingChip from "./map-view-pending-chip";

export default function MapResultsList() {
  const { directory, listed, listOverride, setListOverride, viewArea } =
    useMapFrame();
  const tags = directory?.tags ?? [];
  // A clicked spot's entries are all on the map, so they need no grouping.
  const view = useHeldView(listOverride ? null : viewArea);
  const listRef = useRef<HTMLDivElement>(null);
  const { onMap, elsewhere } = splitByView(listed, view.applied);
  const groups = listGroups({
    onMap,
    elsewhere,
    labels: {
      onMap: (count) => m.map_group_on_map({ count }),
      elsewhere: (count) => m.map_group_elsewhere({ count }),
    },
  });

  // The chip unmounts once pressed, so the list takes focus instead of it dropping to the page.
  function applyView() {
    view.apply();
    listRef.current?.focus();
  }

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="results-heading" className="font-semibold">
          {listOverride
            ? m.map_override_title({ count: listed.length })
            : m.common_entry_count({ count: listed.length })}
        </h2>
        {listOverride ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setListOverride(null)}
          >
            {m.map_override_clear()}
          </Button>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {view.applied ? m.map_on_map_live({ count: onMap.length }) : null}
      </p>
      {listed.length === 0 ? (
        <p>{m.map_empty()}</p>
      ) : (
        <div
          ref={listRef}
          tabIndex={-1}
          aria-labelledby="results-heading"
          className="flex flex-col"
          {...view.holdProps}
        >
          {view.pending ? <MapViewPendingChip onApply={applyView} /> : null}
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-4 pb-4">
              {group.heading ? (
                <h3
                  id={`results-group-${group.id}`}
                  className="text-sm font-medium"
                >
                  {group.heading}
                </h3>
              ) : null}
              <ul
                aria-label={group.heading ? undefined : m.map_results_list()}
                aria-labelledby={
                  group.heading ? `results-group-${group.id}` : undefined
                }
                className="flex flex-col gap-5"
              >
                {group.entries.map((entry) => (
                  <MapResultItem
                    key={entry.slug}
                    entry={entry}
                    tags={tags}
                    nested={Boolean(group.heading)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
