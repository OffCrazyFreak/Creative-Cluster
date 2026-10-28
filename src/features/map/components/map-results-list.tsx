import { useRef } from "react";

import { useSavedEntries } from "@/features/saved/hooks/use-saved-entries";
import { m } from "@/paraglide/messages";

import { useHeldView } from "../hooks/use-held-view";
import { listGroups } from "../list-headings";
import { useMapFrame } from "../map-frame-context";
import { splitByView } from "../view-area";
import MapResultItem from "./map-result-item";
import MapViewPendingChip from "./map-view-pending-chip";

export default function MapResultsList() {
  const { directory, pins, viewArea } = useMapFrame();
  const tags = directory?.tags ?? [];
  const view = useHeldView(viewArea);
  const listRef = useRef<HTMLDivElement>(null);
  const { isSaved } = useSavedEntries();
  const saved = pins.filter((entry) => isSaved(entry.slug));
  const rest = pins.filter((entry) => !isSaved(entry.slug));
  const { onMap, elsewhere } = splitByView(rest, view.applied);
  const savedOnMap = splitByView(saved, view.applied).onMap.length;
  const groups = listGroups({
    saved,
    onMap,
    elsewhere,
    labels: {
      saved: (count) => m.map_group_saved({ count }),
      onMap: (count) => m.map_group_on_map({ count }),
      elsewhere: (count) => m.map_group_elsewhere({ count }),
      others: (count) => m.map_group_others({ count }),
    },
  });

  // The chip unmounts once pressed, so the list takes focus instead of it dropping to the page.
  function applyView() {
    view.apply();
    listRef.current?.focus();
  }

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-4">
      <h2 id="results-heading" className="font-semibold">
        {m.common_entry_count({ count: pins.length })}
      </h2>
      <p role="status" className="sr-only">
        {view.applied
          ? m.map_on_map_live({ count: onMap.length + savedOnMap })
          : null}
      </p>
      {pins.length === 0 ? (
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
