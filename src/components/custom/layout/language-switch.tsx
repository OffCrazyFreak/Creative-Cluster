import { useLocation } from "@tanstack/react-router";

import { site } from "@/sites";
import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";

export default function LanguageSwitch() {
  const { href } = useLocation();
  const target =
    getLocale() === site.baseLocale ? site.secondLocale : site.baseLocale;

  return (
    <a
      href={localizeHref(href, { locale: target })}
      hrefLang={target}
      lang={target}
      aria-label={m.common_language_switch_label()}
    >
      {m.common_language_switch()}
    </a>
  );
}
