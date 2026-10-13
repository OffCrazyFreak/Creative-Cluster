import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

interface ICoordinateFieldsProps {
  lat: number | null;
  lng: number | null;
  canReset: boolean;
  onChange: (lat: number, lng: number) => void;
  onReset: () => void;
}

// The non-drag way to place a pin (WCAG 2.5.7): type the coordinates.
export default function CoordinateFields({
  lat,
  lng,
  canReset,
  onChange,
  onReset,
}: ICoordinateFieldsProps) {
  const base = useId();

  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);

  // Either field's blur reads both, so a pair typed in order is applied once both are valid.
  function commit() {
    const rawLat = latRef.current?.value.trim().replace(",", ".") ?? "";
    const rawLng = lngRef.current?.value.trim().replace(",", ".") ?? "";
    if (rawLat === "" || rawLng === "") return;
    const a = Number(rawLat);
    const b = Number(rawLng);
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) onChange(a, b);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field className="w-40">
        <FieldLabel htmlFor={`${base}-lat`}>
          {m.location_pin_latitude()}
        </FieldLabel>
        <Input
          id={`${base}-lat`}
          inputMode="decimal"
          key={`lat-${lat}`}
          defaultValue={lat?.toFixed(6) ?? ""}
          ref={latRef}
          onBlur={commit}
        />
      </Field>
      <Field className="w-40">
        <FieldLabel htmlFor={`${base}-lng`}>
          {m.location_pin_longitude()}
        </FieldLabel>
        <Input
          id={`${base}-lng`}
          inputMode="decimal"
          key={`lng-${lng}`}
          defaultValue={lng?.toFixed(6) ?? ""}
          ref={lngRef}
          onBlur={commit}
        />
      </Field>
      <Button
        type="button"
        variant="outline"
        disabled={!canReset}
        onClick={onReset}
      >
        {m.location_pin_reset()}
      </Button>
    </div>
  );
}
