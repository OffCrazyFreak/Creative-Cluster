import { LOCATION_COUNTRIES } from "@/constants/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

interface ICountrySelectProps {
  id: string;
  value: string | null;
  onChange: (code: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

function countryItems() {
  const names = new Intl.DisplayNames([getLocale()], { type: "region" });
  return LOCATION_COUNTRIES.map((code) => ({
    value: code,
    label: names.of(code) ?? code,
  })).sort((a, b) => a.label.localeCompare(b.label, getLocale()));
}

export default function CountrySelect({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: ICountrySelectProps) {
  const items = countryItems();
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(code) => code && onChange(code)}
    >
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={m.location_country_placeholder()} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
