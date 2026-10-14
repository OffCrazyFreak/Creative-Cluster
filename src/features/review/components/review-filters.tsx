import { LOCATION_COUNTRIES } from "@/constants/countries";
import { QUEUE_REVIEW_TYPES, REVIEW_AGE_FILTERS } from "@/constants/review";
import { countryName } from "@/features/directory/country-name";
import { REVIEW_STALE_DAYS } from "@/constants/moderation";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { reviewTypeLabel } from "../review-labels";
import type { ReviewListInput } from "../review-schemas";
import FilterSelect from "./filter-select";

interface IReviewFiltersProps {
  value: ReviewListInput;
  onChange: (value: Partial<ReviewListInput>) => void;
}

const ALL = "all";

function ageLabel(age: (typeof REVIEW_AGE_FILTERS)[number]): string {
  if (age === "stale") return m.review_age_stale({ days: REVIEW_STALE_DAYS });
  if (age === "fresh") return m.review_age_fresh({ days: REVIEW_STALE_DAYS });
  return m.review_filter_all();
}

export default function ReviewFilters({
  value,
  onChange,
}: IReviewFiltersProps) {
  const all = { value: ALL, label: m.review_filter_all() };
  const locale = getLocale();
  const countries = LOCATION_COUNTRIES.map((code) => ({
    value: code,
    label: countryName(code, locale),
  })).sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      <FilterSelect
        id="review-type"
        label={m.review_filter_type()}
        value={value.type ?? ALL}
        options={[
          all,
          ...QUEUE_REVIEW_TYPES.map((type) => ({
            value: type,
            label: reviewTypeLabel(type),
          })),
        ]}
        onChange={(next) =>
          onChange({
            type: QUEUE_REVIEW_TYPES.find((type) => type === next),
            page: 1,
          })
        }
      />
      <FilterSelect
        id="review-age"
        label={m.review_filter_age()}
        value={value.age}
        options={REVIEW_AGE_FILTERS.map((age) => ({
          value: age,
          label: ageLabel(age),
        }))}
        onChange={(next) =>
          onChange({
            age: REVIEW_AGE_FILTERS.find((age) => age === next) ?? "all",
            page: 1,
          })
        }
      />
      <FilterSelect
        id="review-country"
        label={m.review_filter_country()}
        value={value.country ?? ALL}
        options={[all, ...countries]}
        onChange={(next) =>
          onChange({ country: next === ALL ? undefined : next, page: 1 })
        }
      />
    </div>
  );
}
