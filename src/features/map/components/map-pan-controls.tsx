import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IMapPanControlsProps {
  getMap: () => MapLibreMap | undefined;
  duration: number;
}

const STEP_PX = 160;

const DIRECTIONS = [
  {
    label: m.map_pan_up,
    icon: ArrowUp,
    offset: [0, -STEP_PX],
    area: "col-start-2",
  },
  {
    label: m.map_pan_left,
    icon: ArrowLeft,
    offset: [-STEP_PX, 0],
    area: "col-start-1 row-start-2",
  },
  {
    label: m.map_pan_right,
    icon: ArrowRight,
    offset: [STEP_PX, 0],
    area: "col-start-3 row-start-2",
  },
  {
    label: m.map_pan_down,
    icon: ArrowDown,
    offset: [0, STEP_PX],
    area: "col-start-2 row-start-3",
  },
] as const;

// Panning is a drag, and WCAG 2.5.7 asks for a single-pointer way to do anything that takes a
// drag. Arrow keys already pan the focused map. Desktop only, left of the zoom buttons.
export default function MapPanControls({
  getMap,
  duration,
}: IMapPanControlsProps) {
  return (
    <div
      role="group"
      aria-label={m.map_pan_group()}
      className="absolute right-14 bottom-2.5 z-1 hidden grid-cols-3 grid-rows-3 gap-1 md:grid"
    >
      {DIRECTIONS.map(({ label, icon: Icon, offset, area }) => (
        <Button
          key={offset.join()}
          type="button"
          variant="outline"
          size="icon"
          aria-label={label()}
          title={label()}
          onClick={() => getMap()?.panBy([offset[0], offset[1]], { duration })}
          className={area}
        >
          <Icon aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
