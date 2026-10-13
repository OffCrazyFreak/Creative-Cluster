import { SlidersHorizontalIcon } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

// The popover, select and checkbox code (about a third of the frame) loads on first use.
function loadMenu() {
  return import("./map-filters-menu");
}
const MapFiltersMenu = lazy(loadMenu);

function TriggerButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={m.map_filters_button()}
      {...props}
    >
      <SlidersHorizontalIcon aria-hidden="true" />
      {m.map_filters_button()}
    </Button>
  );
}

export default function MapFiltersTrigger() {
  const [wanted, setWanted] = useState(false);
  if (!wanted)
    return (
      <TriggerButton
        onClick={() => setWanted(true)}
        onPointerEnter={() => void loadMenu()}
        onFocus={() => void loadMenu()}
      />
    );
  return (
    <Suspense fallback={<TriggerButton disabled />}>
      <MapFiltersMenu defaultOpen />
    </Suspense>
  );
}
