import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IMapSearchAreaButtonProps {
  onClick: () => void;
}

export default function MapSearchAreaButton({
  onClick,
}: IMapSearchAreaButtonProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center max-md:top-32">
      <Button className="pointer-events-auto" onClick={onClick}>
        {m.map_search_area()}
      </Button>
    </div>
  );
}
