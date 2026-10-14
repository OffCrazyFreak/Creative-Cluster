import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_TYPES,
} from "@/constants/opportunities";
import { countryName } from "@/features/directory/country-name";
import MapFilterSelect from "@/features/map/components/map-filter-select";
import { tagLabel } from "@/features/tags/tag-label";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { IPublicOpportunities } from "../opportunity-list-schemas";
import { categoryLabel, typeLabel } from "../opportunity-labels";
import {
  hasOpportunityFilters,
  type OpportunitySearch,
} from "../opportunity-search";

interface IOpportunityFiltersProps {
  search: OpportunitySearch & { tags: string; country: string };
  facets: IPublicOpportunities["facets"];
}

const ANY = { value: "", label: "" };

export default function OpportunityFilters({
  search,
  facets,
}: IOpportunityFiltersProps) {
  const navigate = useNavigate({ from: "/opportunities/" });
  const locale = getLocale();
  const any = { ...ANY, label: m.opportunities_filter_any() };

  function set(patch: Record<string, string | boolean | undefined>) {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    });
  }

  return (
    <form
      aria-label={m.opportunities_filters_label()}
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => event.preventDefault()}
    >
      <MapFilterSelect
        id="opp-type"
        label={m.opportunities_filter_type()}
        value={search.type ?? ""}
        options={[
          any,
          ...OPPORTUNITY_TYPES.map((value) => ({
            value,
            label: typeLabel(value),
          })),
        ]}
        onChange={(value) =>
          set({ type: OPPORTUNITY_TYPES.find((item) => item === value) })
        }
      />
      <MapFilterSelect
        id="opp-category"
        label={m.opportunities_filter_category()}
        value={search.category ?? ""}
        options={[
          any,
          ...OPPORTUNITY_CATEGORIES.map((value) => ({
            value,
            label: categoryLabel(value),
          })),
        ]}
        onChange={(value) =>
          set({
            category: OPPORTUNITY_CATEGORIES.find((item) => item === value),
          })
        }
      />
      <MapFilterSelect
        id="opp-country"
        label={m.opportunities_filter_country()}
        value={search.country}
        options={[
          any,
          ...facets.countries.map((code) => ({
            value: code,
            label: countryName(code, locale),
          })),
        ]}
        onChange={(value) => set({ country: value })}
      />
      <MapFilterSelect
        id="opp-tag"
        label={m.opportunities_filter_tag()}
        value={search.tags.split(",")[0] ?? ""}
        options={[
          any,
          ...facets.tags.map((item) => ({
            value: item.slug,
            label: tagLabel(item, locale),
          })),
        ]}
        onChange={(value) => set({ tags: value })}
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="opp-closing"
            checked={Boolean(search.closing)}
            onCheckedChange={(checked) =>
              set({ closing: checked || undefined })
            }
          />
          <Label htmlFor="opp-closing">
            {m.opportunities_filter_closing()}
          </Label>
        </div>
        {hasOpportunityFilters(search) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                type: undefined,
                category: undefined,
                closing: undefined,
                tags: "",
                country: "",
              })
            }
          >
            {m.opportunities_filter_clear()}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
