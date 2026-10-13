import type { AppLocale } from "@/constants/locales";
import type { EntryKind } from "@/constants/entry";
import type { MapStyleId } from "@/constants/map-styles";

import type { SiteId } from "./site-id.ts";

export interface ISiteLegalIdentity {
  name: string;
  seat: string;
  oib: string;
  registerNumber: string;
  representative: string;
  email: string;
}

export interface ISiteConfig {
  id: SiteId;
  name: string;
  shortName: string;
  origin: string;
  baseLocale: AppLocale;
  secondLocale: AppLocale;
  entryKinds: readonly EntryKind[];
  tagSeed: "creative-europe" | "esco";
  showFundingLine: boolean;
  contactEmail: string;
  legal: ISiteLegalIdentity;
  searchConsoleToken: string | null;
  map: { center: [number, number]; zoom: number; style: MapStyleId };
}
