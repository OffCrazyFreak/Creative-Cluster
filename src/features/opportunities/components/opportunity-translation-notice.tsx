import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";

interface IOpportunityTranslationNoticeProps {
  sourceLocale: AppLocale;
  origin: "machine" | "human" | null;
  missing: boolean;
  showOriginal: boolean;
  onToggleOriginal: () => void;
}

function languageFrom(locale: AppLocale) {
  return locale === "hr"
    ? m.translation_language_from_hr()
    : m.translation_language_from_en();
}

function languageName(locale: AppLocale) {
  return locale === "hr"
    ? m.translation_language_hr()
    : m.translation_language_en();
}

// Same wording as the entry page: say it is machine translated and let the reader see the original.
export default function OpportunityTranslationNotice({
  sourceLocale,
  origin,
  missing,
  showOriginal,
  onToggleOriginal,
}: IOpportunityTranslationNoticeProps) {
  if (missing)
    return (
      <p className="text-sm">
        {m.translation_unavailable({ language: languageName(sourceLocale) })}
      </p>
    );
  if (!origin) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-sm">
      <span>
        {origin === "human"
          ? m.translation_label_human({ language: languageFrom(sourceLocale) })
          : m.translation_label_machine({
              language: languageFrom(sourceLocale),
            })}
      </span>
      <span aria-hidden="true">·</span>
      <Button
        type="button"
        variant="link"
        className="h-auto min-h-6 p-0"
        aria-expanded={showOriginal}
        onClick={onToggleOriginal}
      >
        {showOriginal
          ? m.translation_hide_original()
          : m.translation_show_original()}
      </Button>
    </p>
  );
}
