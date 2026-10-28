import type { ISiteConfig } from "./site-config-types.ts";

// Values marked TODO are placeholders until the clients send the facts (site-texts/CHECKLIST.md).
// Inovatori DNŽ runs both sites and is the Creative Cluster privacy contact, so the legal identity is shared.
export const rpcc = {
  id: "rpcc",
  name: "Creative Cluster",
  shortName: "Creative Cluster",
  origin: "https://creativecluster.restorativepractices.xyz",
  baseLocale: "en",
  secondLocale: "hr",
  entryKinds: ["organization", "outside_partner"],
  tagSeed: "creative-europe",
  showFundingLine: true,
  contactEmail: "TODO-contact@restorativepractices.xyz",
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
    center: [10, 48],
    zoom: 3.5,
    style: "openfreemap",
    // Europe, Iceland and the Canaries to the Urals.
    ipBounds: [
      [-25, 27],
      [45, 72],
    ],
  },
} as const satisfies ISiteConfig;
