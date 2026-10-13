import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { m } from "@/paraglide/messages";

import type { IAddressOption } from "./address-options";

// Selection lives in the form value; the input text is the only state the list needs.
const NO_SELECTION = null as IAddressOption | null;

interface IAddressComboboxProps {
  id: string;
  options: IAddressOption[];
  inputValue: string;
  open: boolean;
  disabled: boolean;
  busy: boolean;
  onInputChange: (text: string) => void;
  onOpenChange: (open: boolean) => void;
  onPick: (option: IAddressOption) => void;
  onSearch: () => void;
}

// filter={null}: the server already ranked the matches, so Base UI must not filter them again.
export default function AddressCombobox({
  id,
  options,
  inputValue,
  open,
  disabled,
  busy,
  onInputChange,
  onOpenChange,
  onPick,
  onSearch,
}: IAddressComboboxProps) {
  return (
    <div className="flex gap-2">
      <Combobox
        items={options}
        filter={null}
        value={NO_SELECTION}
        inputValue={inputValue}
        open={open}
        onOpenChange={onOpenChange}
        // Only typing counts: picking an item makes Base UI blank the input, and AddressField sets the full text itself.
        onInputValueChange={(text, details) => {
          if (details.reason === "input-change") onInputChange(text);
        }}
        onValueChange={(option) => option && onPick(option)}
        itemToStringLabel={(option) => option?.label ?? ""}
        isItemEqualToValue={(a, b) => a?.id === b?.id}
      >
        <ComboboxInput
          id={id}
          className="flex-1"
          placeholder={m.location_address_placeholder()}
          autoComplete="off"
          disabled={disabled}
          showTrigger={false}
        />
        <ComboboxContent>
          <ComboboxList>
            {(option: IAddressOption) => (
              <ComboboxItem key={option.id} value={option}>
                <span className="flex flex-col">
                  <span>{option.label}</span>
                  {option.secondary ? (
                    <span className="text-xs">{option.secondary}</span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        onClick={onSearch}
      >
        <SearchIcon />
        {m.location_search_button()}
      </Button>
    </div>
  );
}
