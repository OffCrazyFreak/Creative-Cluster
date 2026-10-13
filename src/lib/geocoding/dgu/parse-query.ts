import { normalizeSearch } from "@/utils/normalize-search";

export interface IDguQuery {
  streetWords: string[];
  // Words after the house number: settlement, postcode.
  placeWords: string[];
  houseNumber: number | null;
  // Same shape as hr_address.suffix: "A", "/1" or "A/1".
  suffix: string;
}

// "3", "3a", "69/7" or "105a/1" as a whole word. Five digits never match, so postcodes stay out.
const HOUSE_NUMBER =
  /(?:^|\s)(\d{1,4})\s?([a-zA-Z]{0,2})(?:\s?\/\s?(\d{1,3}[a-zA-Z]?))?(?=[\s,]|$)/g;

export function parseAddressQuery(text: string): IDguQuery {
  for (const match of text.matchAll(HOUSE_NUMBER)) {
    const before = normalizeSearch(text.slice(0, match.index));
    if (!before) continue;
    const second = match[3] ? `/${match[3]}` : "";
    return {
      streetWords: before.split(" "),
      placeWords: normalizeSearch(text.slice(match.index + match[0].length))
        .split(" ")
        .filter(Boolean),
      houseNumber: Number(match[1]),
      suffix: `${match[2] ?? ""}${second}`.toUpperCase(),
    };
  }
  return {
    streetWords: normalizeSearch(text).split(" ").filter(Boolean),
    placeWords: [],
    houseNumber: null,
    suffix: "",
  };
}
