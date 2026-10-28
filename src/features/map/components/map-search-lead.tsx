import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IMapSearchLeadProps {
  open: boolean;
  // True when a key pressed it, so focus can go back to the field.
  onBack: (byKeyboard: boolean) => void;
  menu: ReactNode;
}

// The bar's first button: the menu, or the way back once the search is open.
export default function MapSearchLead({
  open,
  onBack,
  menu,
}: IMapSearchLeadProps) {
  if (!open)
    return (
      <div className="shrink-0 animate-in fade-in-0 slide-in-from-left-4 motion-reduce:animate-none">
        {menu}
      </div>
    );
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={m.map_back_to_map()}
      // A keyboard press reports no clicks in event.detail.
      onClick={(event) => onBack(event.detail === 0)}
      className="shrink-0 animate-in fade-in-0 slide-in-from-left-4 motion-reduce:animate-none"
    >
      <ArrowLeft aria-hidden="true" />
    </Button>
  );
}
