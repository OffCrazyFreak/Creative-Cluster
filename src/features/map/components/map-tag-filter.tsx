import { Checkbox } from "@/components/ui/checkbox";
import { tagLabel } from "@/features/directory/tag-label";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useMapFrame } from "../map-frame-context";
import { useMapFacets } from "../hooks/use-map-facets";
import { useUpdateMapSearch } from "../hooks/use-update-map-search";

export default function MapTagFilter() {
  const { directory, filters } = useMapFrame();
  const { tags } = useMapFacets(directory);
  const update = useUpdateMapSearch();
  const locale = getLocale();
  if (tags.length === 0) return null;

  function toggle(slug: string, on: boolean) {
    const next = on
      ? [...filters.tags, slug]
      : filters.tags.filter((item) => item !== slug);
    void update({ tags: next.join(",") });
  }

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-medium">{m.map_filter_tags()}</legend>
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {tags.map((item) => (
          <li key={item.slug}>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={filters.tags.includes(item.slug)}
                onCheckedChange={(checked) => toggle(item.slug, checked)}
              />
              {tagLabel({ labelEn: item.en, labelHr: item.hr }, locale)} (
              {item.count})
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
