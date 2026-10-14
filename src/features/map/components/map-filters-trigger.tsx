import { lazy, Suspense, useState } from "react";

import MapTriggerButton from "./map-trigger-button";

// The popover, select and checkbox code (about a third of the frame) loads on first use.
function loadMenu() {
  return import("./map-filters-menu");
}
const MapFiltersMenu = lazy(loadMenu);

export default function MapFiltersTrigger() {
  const [wanted, setWanted] = useState(false);
  if (!wanted)
    return (
      <MapTriggerButton
        onClick={() => setWanted(true)}
        onPointerEnter={() => void loadMenu()}
        onFocus={() => void loadMenu()}
      />
    );
  return (
    <Suspense fallback={<MapTriggerButton disabled />}>
      <MapFiltersMenu defaultOpen />
    </Suspense>
  );
}
