import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IMapViewPendingChipProps {
  onApply: () => void;
}

export default function MapViewPendingChip({
  onApply,
}: IMapViewPendingChipProps) {
  return (
    // Zero height, so the rows the hold protects do not move when it appears.
    <div className="sticky top-2 z-10 flex h-0 justify-center">
      <Button size="sm" onClick={onApply}>
        {m.map_view_pending()}
      </Button>
    </div>
  );
}
