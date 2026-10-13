import { useId, useState } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

import type { LocationValue } from "../location-schemas";
import {
  valueFromHit,
  valueFromManual,
  valueOnlineOnly,
} from "../location-value";
import AddressAttribution from "./address-attribution";
import AddressCombobox from "./address-combobox";
import OnlineSwitch from "./online-switch";
import PrecisionNote from "./precision-note";
import {
  MANUAL_OPTION_ID,
  toOptions,
  type IAddressOption,
} from "./address-options";
import CountrySelect from "./country-select";
import { useAddressSearch } from "./use-address-search";

export interface IAddressFieldProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  // Country preselected for new entries (the site's home country); the user can still change it.
  defaultCountryCode?: string;
}

export default function AddressField({
  value,
  onChange,
  defaultCountryCode,
}: IAddressFieldProps) {
  const base = useId();
  const [inputValue, setInputValue] = useState(value.addressText ?? "");
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const countryCode = value.countryCode ?? defaultCountryCode ?? null;
  const search = useAddressSearch(inputValue, countryCode ?? undefined);

  function pick(option: IAddressOption) {
    if (option.id === MANUAL_OPTION_ID || !option.hit) {
      setManual(true);
      onChange(
        valueFromManual(value, {
          city: value.city ?? "",
          countryCode,
          addressText: inputValue,
        }),
      );
      return;
    }
    const next = valueFromHit(value, option.hit);
    search.markPicked(next.addressText ?? "");
    setInputValue(next.addressText ?? "");
    setManual(false);
    onChange(next);
  }

  if (value.onlineOnly) {
    return (
      <OnlineSwitch
        id={`${base}-online`}
        online
        onChange={(online) => onChange(valueOnlineOnly(value, online))}
      />
    );
  }

  const statusText = search.loading
    ? m.location_searching()
    : search.degraded
      ? m.location_degraded()
      : search.failed
        ? m.location_limit_reached()
        : search.settled && search.hits.length === 0
          ? m.location_no_results()
          : search.settled
            ? m.location_results_count({ count: search.hits.length })
            : "";

  return (
    <div className="flex flex-col gap-4">
      <OnlineSwitch
        id={`${base}-online`}
        online={false}
        onChange={(online) => onChange(valueOnlineOnly(value, online))}
      />
      <Field>
        <FieldLabel htmlFor={`${base}-country`}>
          {m.location_manual_country()}
        </FieldLabel>
        <CountrySelect
          id={`${base}-country`}
          value={countryCode}
          onChange={(code) => onChange({ ...value, countryCode: code })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${base}-address`}>
          {m.location_address_label()}
        </FieldLabel>
        <AddressCombobox
          id={`${base}-address`}
          options={toOptions(search.hits, m.location_manual_row())}
          inputValue={inputValue}
          open={open}
          disabled={!countryCode}
          busy={search.loading}
          onInputChange={setInputValue}
          onOpenChange={setOpen}
          onPick={pick}
          onSearch={() => {
            search.runSearch();
            setOpen(true);
          }}
        />
        <FieldDescription>{m.location_address_hint()}</FieldDescription>
        <p role="status" className="text-sm">
          {statusText}
        </p>
      </Field>
      {manual ? (
        <Field>
          <FieldLabel htmlFor={`${base}-city`}>
            {m.location_manual_city()}
          </FieldLabel>
          <Input
            id={`${base}-city`}
            value={value.city ?? ""}
            onChange={(event) =>
              onChange(
                valueFromManual(value, {
                  city: event.target.value,
                  countryCode,
                  addressText: inputValue,
                }),
              )
            }
          />
        </Field>
      ) : null}
      <PrecisionNote precision={value.precision} />
      <AddressAttribution
        countryCode={countryCode ?? undefined}
        hits={search.hits}
      />
    </div>
  );
}
