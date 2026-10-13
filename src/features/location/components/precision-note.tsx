import type { LocationPrecision } from "@/constants/entry";
import { m } from "@/paraglide/messages";

interface IPrecisionNoteProps {
  precision: LocationPrecision | null;
}

// A street- or town-level match is never silently accepted: the owner is told to check the pin.
export default function PrecisionNote({ precision }: IPrecisionNoteProps) {
  if (!precision) return null;
  const text = {
    house: m.location_precision_house(),
    street: m.location_precision_street(),
    town: m.location_precision_town(),
  }[precision];
  return <p className="text-sm">{text}</p>;
}
