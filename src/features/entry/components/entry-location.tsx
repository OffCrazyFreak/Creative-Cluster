import { countryName } from "@/features/directory/country-name";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { IPublicLocation } from "../entry-schemas";

interface IEntryLocationProps {
  location: IPublicLocation;
}

export function placeLine(location: IPublicLocation) {
  const country = location.countryCode
    ? countryName(location.countryCode, getLocale())
    : null;
  return [location.city, country].filter(Boolean).join(", ");
}

// Address only when the display rule and the visibility setting both allow it; otherwise the town.
export default function EntryLocation({ location }: IEntryLocationProps) {
  const line = location.onlineOnly
    ? m.entry_location_online()
    : [location.addressText, placeLine(location)].filter(Boolean).join(", ");
  if (!line) return null;

  return (
    <section aria-labelledby="entry-location" className="flex flex-col gap-1">
      <h2 id="entry-location" className="font-semibold">
        {m.entry_section_location()}
      </h2>
      <p>{line}</p>
    </section>
  );
}
