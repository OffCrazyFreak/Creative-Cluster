import type { ISiteConfig } from "./site-config-types.ts";

// Values marked TODO are placeholders until the clients send the facts (site-texts/CHECKLIST.md).
export const dnz = {
  id: "dnz",
  name: "Registar inovatora DNŽ",
  shortName: "Registar inovatora",
  origin: "https://registar.inovatoridnz.net",
  baseLocale: "hr",
  secondLocale: "en",
  entryKinds: ["organization", "person", "outside_partner"],
  tagSeed: "esco",
  showFundingLine: false,
  contactEmail: "TODO-contact@inovatoridnz.net",
  legal: {
    name: "TODO legal name (Udruga inovatora DNŽ)",
    seat: "TODO seat",
    oib: "TODO OIB",
    registerNumber: "TODO register number",
    representative: "TODO representative",
    email: "TODO-privacy@inovatoridnz.net",
  },
  searchConsoleToken: null,
  map: {
    center: [17.6, 42.85],
    zoom: 8,
    style: "openfreemap",
    // Croatia.
    ipBounds: [
      [13.4, 42.3],
      [19.5, 46.6],
    ],
  },
} as const satisfies ISiteConfig;
