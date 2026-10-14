import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { missingFields } from "../translation-indexing";
import type { ITranslationView } from "../translation-fields";
import TranslationEditForm from "./translation-edit-form";

interface ITranslationNoticeProps {
  view: ITranslationView;
  showOriginal: boolean;
  onToggleOriginal: () => void;
}

const fromLanguage = {
  hr: () => m.translation_language_from_hr(),
  en: () => m.translation_language_from_en(),
};
const languageName = {
  hr: () => m.translation_language_hr(),
  en: () => m.translation_language_en(),
};

export default function TranslationNotice({
  view,
  showOriginal,
  onToggleOriginal,
}: ITranslationNoticeProps) {
  const [editing, setEditing] = useState(false);
  // Only fields that are on the page count; leftover rows of emptied fields are not shown.
  const translated = view.sourceFields.flatMap(
    (field) => view.texts[field] ?? [],
  );
  const hasMissing = missingFields(view).length > 0;
  if (view.sourceFields.length === 0) return null;

  const allHuman =
    translated.length > 0 && translated.every((t) => t.origin === "human");
  const label = allHuman
    ? m.translation_label_human({ language: fromLanguage[view.sourceLocale]() })
    : m.translation_label_machine({
        language: fromLanguage[view.sourceLocale](),
      });

  return (
    <div className="flex flex-col gap-2">
      {translated.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-1 text-sm">
          <span>{label}</span>
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
      ) : null}
      {hasMissing ? (
        <p className="text-sm">
          {m.translation_unavailable({
            language: languageName[view.sourceLocale](),
          })}
        </p>
      ) : null}
      {view.canEdit ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="self-start"
            aria-expanded={editing}
            onClick={() => setEditing((open) => !open)}
          >
            {editing ? m.translation_edit_close() : m.translation_edit_open()}
          </Button>
          {editing ? <TranslationEditForm view={view} /> : null}
        </div>
      ) : null}
    </div>
  );
}
