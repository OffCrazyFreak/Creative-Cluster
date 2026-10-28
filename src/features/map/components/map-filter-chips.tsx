import { Button } from "@/components/ui/button";
import { countryName } from "@/features/directory/country-name";
import { tagLabel } from "@/features/directory/tag-label";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useMapFacets } from "../hooks/use-map-facets";
import { useUpdateMapSearch } from "../hooks/use-update-map-search";
import { useMapFrame } from "../map-frame-context";
import MapRemovableChip from "./map-removable-chip";

const POPULAR_TAGS = 6;

export default function MapFilterChips() {
  const { directory, filters } = useMapFrame();
  const { tags } = useMapFacets(directory);
  const update = useUpdateMapSearch();
  const locale = getLocale();
  function labelOf(slug: string) {
    const found = directory?.tags.find((item) => item.slug === slug);
    return found
      ? tagLabel({ labelEn: found.en, labelHr: found.hr }, locale)
      : slug;
  }
  function toggleTag(slug: string) {
    void update({
      tags: (filters.tags.includes(slug)
        ? filters.tags.filter((item) => item !== slug)
        : [...filters.tags, slug]
      ).join(","),
    });
  }

  return (
    <ul
      aria-label={m.map_popular_tags()}
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {tags.slice(0, POPULAR_TAGS).map((item) => (
        <li key={item.slug} className="shrink-0">
          <Button
            variant={filters.tags.includes(item.slug) ? "default" : "outline"}
            size="sm"
            aria-pressed={filters.tags.includes(item.slug)}
            onClick={() => toggleTag(item.slug)}
          >
            {tagLabel({ labelEn: item.en, labelHr: item.hr }, locale)}
          </Button>
        </li>
      ))}
      {filters.tags
        .filter(
          (slug) =>
            !tags.slice(0, POPULAR_TAGS).some((item) => item.slug === slug),
        )
        .map((slug) => (
          <li key={slug} className="shrink-0">
            <MapRemovableChip
              label={labelOf(slug)}
              onRemove={() => toggleTag(slug)}
            />
          </li>
        ))}
      {filters.q ? (
        <li className="shrink-0">
          <MapRemovableChip
            label={m.map_chip_text({ text: filters.q })}
            onRemove={() => void update({ q: "" })}
          />
        </li>
      ) : null}
      {filters.country ? (
        <li className="shrink-0">
          <MapRemovableChip
            label={countryName(filters.country, locale)}
            onRemove={() => void update({ country: "" })}
          />
        </li>
      ) : null}
      {filters.legal ? (
        <li className="shrink-0">
          <MapRemovableChip
            label={filters.legal}
            onRemove={() => void update({ legal: "" })}
          />
        </li>
      ) : null}
      {filters.near && filters.radiusKm > 0 ? (
        <li className="shrink-0">
          <MapRemovableChip
            label={m.map_chip_near({ km: filters.radiusKm })}
            onRemove={() => void update({ near: "", radius: 0 })}
          />
        </li>
      ) : null}
    </ul>
  );
}
