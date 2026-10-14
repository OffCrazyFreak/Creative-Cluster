import type { AppLocale } from "@/constants/locales";
import type { ISiteConfig } from "@/sites/site-config-types";

const TOKEN_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    "legal.seat": "association seat",
    "legal.oib": "association OIB",
    "legal.registerNumber": "register number",
    "legal.representative": "authorised representative",
    "legal.email": "privacy contact email",
    contactEmail: "contact email",
  },
  hr: {
    "legal.seat": "sjedište udruge",
    "legal.oib": "OIB udruge",
    "legal.registerNumber": "registarski broj",
    "legal.representative": "osoba ovlaštena za zastupanje",
    "legal.email": "e-adresa za privatnost",
    contactEmail: "kontakt e-adresa",
  },
};

function tokenValues(site: ISiteConfig): Record<string, string> {
  return {
    siteName: site.name,
    siteAddress: site.origin.replace(/^https?:\/\//, ""),
    cookiePrefix: `cc-${site.id}`,
    contactEmail: site.contactEmail,
    "legal.seat": site.legal.seat,
    "legal.oib": site.legal.oib,
    "legal.registerNumber": site.legal.registerNumber,
    "legal.representative": site.legal.representative,
    "legal.email": site.legal.email,
  };
}

// Site config facts that are still TODO show up as visible gaps, never as silent text.
function gapIfTodo(token: string, value: string, locale: AppLocale): string {
  return value.startsWith("TODO")
    ? `[[GAP: ${TOKEN_LABELS[locale][token] ?? token}]]`
    : value;
}

// Gaps become links with the gap: scheme so the renderer can mark them without raw HTML.
function gapsToLinks(text: string): string {
  return text.replace(
    /\[\[GAP:?([^\]]*)\]\]/g,
    (_m, body: string) => `[\\[\\[GAP:${body}\\]\\]](gap:)`,
  );
}

export function fillContent(
  source: string,
  site: ISiteConfig,
  locale: AppLocale,
): string {
  const values = tokenValues(site);
  const filled = source.replace(/\{\{([\w.]+)\}\}/g, (match, token: string) => {
    const value = values[token];
    return value === undefined ? match : gapIfTodo(token, value, locale);
  });
  return gapsToLinks(filled);
}
