import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { m } from "@/paraglide/messages";

import { townsQueryOptions } from "../location-queries";
import type { LocationValue } from "../location-schemas";
import { valueFromTown } from "../location-value";
import { searchTowns } from "../town-search";
import type { ITown } from "../town-types";
import CountrySelect from "./country-select";

export interface ITownPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  defaultCountryCode?: string;
  invalid?: boolean;
  describedBy?: string;
}

// For people: only a town from the static GeoNames list, never an address (privacy by default).
export default function TownPicker({
  value,
  onChange,
  defaultCountryCode,
  invalid,
  describedBy,
}: ITownPickerProps) {
  const base = useId();
  const countryCode = value.countryCode ?? defaultCountryCode ?? null;
  const [text, setText] = useState(value.city ?? "");
  const justPicked = useRef(false);
  const { data: towns = [] } = useQuery({
    ...townsQueryOptions(countryCode ?? "HR"),
    enabled: Boolean(countryCode),
  });
  const matches = searchTowns(towns, text);

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={`${base}-country`}>
          {m.location_manual_country()}
        </FieldLabel>
        <CountrySelect
          id={`${base}-country`}
          invalid={invalid}
          describedBy={describedBy}
          value={countryCode}
          onChange={(code) => {
            setText("");
            onChange({
              ...value,
              countryCode: code,
              city: null,
              lat: null,
              lng: null,
            });
          }}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${base}-town`}>
          {m.location_town_label()}
        </FieldLabel>
        <Combobox
          items={matches}
          filter={null}
          value={null as ITown | null}
          inputValue={text}
          onInputValueChange={(next, details) => {
            // Picking an item makes Base UI echo the label and then clear its controlled input; the pick
            // itself already set the text, and a real edit or clear comes as a later event.
            if (details.reason === "item-press") return;
            if (details.reason === "input-clear" && justPicked.current) {
              justPicked.current = false;
              return;
            }
            justPicked.current = false;
            setText(next);
            // Editing after a pick must not leave the old town's coordinates behind.
            if (value.lat !== null && next !== value.city)
              onChange({
                ...value,
                addressText: null,
                lat: null,
                lng: null,
                city: null,
                precision: null,
                source: null,
                townPopulation: undefined,
              });
          }}
          onValueChange={(town) => {
            if (!town) return;
            justPicked.current = true;
            setText(town.name);
            onChange(valueFromTown(value, town));
          }}
          itemToStringLabel={(town) => town?.name ?? ""}
          isItemEqualToValue={(a, b) => a?.lat === b?.lat && a?.lng === b?.lng}
        >
          <ComboboxInput
            id={`${base}-town`}
            maxLength={120}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            placeholder={m.location_town_placeholder()}
            autoComplete="off"
            disabled={!countryCode}
            showTrigger={false}
          />
          <ComboboxContent>
            <ComboboxEmpty>{m.location_town_none()}</ComboboxEmpty>
            <ComboboxList>
              {(town: ITown) => (
                <ComboboxItem key={`${town.lat},${town.lng}`} value={town}>
                  <span className="flex flex-col">
                    <span>{town.name}</span>
                    <span className="text-xs">
                      {m.location_town_population({
                        count: town.population.toLocaleString(),
                      })}
                    </span>
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <FieldDescription>{m.location_town_note()}</FieldDescription>
      </Field>
      <p className="text-xs">{m.location_town_credit()}</p>
    </div>
  );
}
