import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { useMapFrame } from "../map-frame-context";
import MapResultItem from "./map-result-item";

export default function MapResultsList() {
  const { directory, listed, listOverride, setListOverride } = useMapFrame();
  const tags = directory?.tags ?? [];

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
      {listed.length === 0 ? (
        <p>{m.map_empty()}</p>
      ) : (
        <ul aria-label={m.map_results_list()} className="flex flex-col gap-5">
          {listed.map((entry) => (
            <MapResultItem key={entry.slug} entry={entry} tags={tags} />
          ))}
        </ul>
      )}
    </section>
  );
}
