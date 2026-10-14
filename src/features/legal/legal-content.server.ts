import { site } from "@/sites";
import type { AppLocale } from "@/constants/locales";

import { fillContent } from "./fill-content";
import type { LegalPage } from "./legal-pages";

// Read on the server only: no Markdown file may become a public client asset (the admin guide is admin-only).
const files = import.meta.glob<string>("/content/*/*/*.md", {
  query: "?raw",
  import: "default",
});

export async function readLegalContent(
  page: LegalPage,
  locale: AppLocale,
): Promise<string> {
  const load = files[`/content/${site.id}/${locale}/${page}.md`];
  if (!load) throw new Error(`Missing legal content ${page} (${locale})`);
  return fillContent(await load(), site, locale);
}
