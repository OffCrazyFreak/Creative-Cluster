import { getLocale } from "@/paraglide/runtime";

import { getAdminHelp, getLegalContent } from "./legal.functions";
import type { PublicLegalPage } from "./legal-pages";

export function loadLegalContent(page: PublicLegalPage): Promise<string> {
  return getLegalContent({ data: { page, locale: getLocale() } });
}

export function loadAdminHelp(): Promise<string> {
  return getAdminHelp({ data: { locale: getLocale() } });
}
