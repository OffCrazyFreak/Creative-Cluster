import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface IMapFilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

// Base UI selects need a non-empty value, so the "any" option is the empty string mapped to a sentinel.
const ANY = "__any__";

export default function MapFilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: IMapFilterSelectProps) {
  const items = options.map((o) => ({
    value: o.value === "" ? ANY : o.value,
    label: o.label,
  }));
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={items}
        value={value === "" ? ANY : value}
        onValueChange={(next) =>
          onChange(next === ANY || next === null ? "" : next)
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
