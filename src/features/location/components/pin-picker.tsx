import { ClientOnly } from "@tanstack/react-router";
import { lazy } from "react";

import { m } from "@/paraglide/messages";

import type { LocationValue } from "../location-schemas";
import CoordinateFields from "./coordinate-fields";
import { usePinController } from "./use-pin-controller";

// maplibre-gl touches window on import, so it only loads in the browser.
const PinMap = lazy(() => import("./pin-map.client"));

export interface IPinPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}

let webgl2: boolean | undefined;

// Probed once: every probe allocates a GL context, and browsers drop the oldest past about 16.
function supportsWebGL2(): boolean {
  webgl2 ??= (() => {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      return false;
    }
  })();
  return webgl2;
}

export default function PinPicker({ value, onChange }: IPinPickerProps) {
  const controller = usePinController(value, onChange);

  return (
    <div className="flex flex-col gap-3">
      <h3>{m.location_pin_title()}</h3>
      <p className="text-sm">{m.location_pin_help()}</p>
      <ClientOnly fallback={<div className="h-72 w-full" />}>
        {supportsWebGL2() ? (
          <PinMap
            pin={controller.pin}
            countryCode={value.countryCode}
            label={m.location_pin_map_label()}
            onMove={(point, via) => controller.move(point, via)}
          />
        ) : (
          <p role="alert">{m.location_pin_no_webgl()}</p>
        )}
      </ClientOnly>
      {controller.pin ? null : (
        <p className="text-sm">{m.location_pin_empty()}</p>
      )}
      {value.pinMovedByHand ? (
        <p className="text-sm">{m.location_pin_moved()}</p>
      ) : null}
      <CoordinateFields
        lat={value.lat}
        lng={value.lng}
        canReset={controller.canReset}
        onChange={(lat, lng) => controller.move({ lat, lng }, "fields")}
        onReset={controller.reset}
      />
    </div>
  );
}
