import { site } from "@/sites";
import { getLocale } from "@/paraglide/runtime";

import {
  ESCO_ATTRIBUTION,
  ESCO_ATTRIBUTION_HR,
} from "../seeds/esco-attribution";

// ESCO's CC BY 4.0 licence requires the acknowledgement wherever its skill groups are used (DNZ only).
export default function EscoFooterNote() {
  if (site.id !== "dnz") return null;
  return <p>{getLocale() === "hr" ? ESCO_ATTRIBUTION_HR : ESCO_ATTRIBUTION}</p>;
}
