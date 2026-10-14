import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IMapRemovableChipProps {
  label: string;
  onRemove: () => void;
}

export default function MapRemovableChip({
  label,
  onRemove,
}: IMapRemovableChipProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={m.map_chip_remove({ label })}
      onClick={onRemove}
    >
      {label}
      <XIcon aria-hidden="true" />
    </Button>
  );
}
