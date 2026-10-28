import { SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countryName } from "@/features/directory/country-name";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useMapFacets } from "../hooks/use-map-facets";
import { useUpdateMapSearch } from "../hooks/use-update-map-search";
import { useMapFrame } from "../map-frame-context";
import MapDistanceFilter from "./map-distance-filter";
import MapFilterSelect from "./map-filter-select";
import MapTagFilter from "./map-tag-filter";

interface IMapFiltersMenuProps {
  defaultOpen?: boolean;
}

export default function MapFiltersMenu({ defaultOpen }: IMapFiltersMenuProps) {
  const { directory, search } = useMapFrame();
  const { countries, legal } = useMapFacets(directory);
  const update = useUpdateMapSearch();
  const locale = getLocale();

  function clearAll() {
    void update({
      q: "",
      tags: "",
      country: "",
      legal: "",
      near: "",
      radius: 0,
    });
  }

  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={m.map_filters_button()}
          />
        }
      >
        <SlidersHorizontalIcon aria-hidden="true" />
        {m.map_filters_button()}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[70dvh] w-80 overflow-y-auto"
      >
        <PopoverTitle>{m.map_filters_title()}</PopoverTitle>
        <MapTagFilter />
        <MapFilterSelect
          id="map-filter-country"
          label={m.map_filter_country()}
          value={search.country.toUpperCase()}
          options={[
            { value: "", label: m.map_filter_country_any() },
            ...countries.map((code) => ({
              value: code,
              label: countryName(code, locale),
            })),
          ]}
          onChange={(country) => void update({ country })}
        />
        {legal.length > 0 ? (
          <MapFilterSelect
            id="map-filter-legal"
            label={m.map_filter_legal()}
            value={search.legal}
            options={[
              { value: "", label: m.map_filter_legal_any() },
              ...legal.map((value) => ({ value, label: value })),
            ]}
            onChange={(value) => void update({ legal: value })}
          />
        ) : null}
        <MapDistanceFilter />
        <Button variant="outline" size="sm" onClick={clearAll}>
          {m.map_filter_clear()}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
