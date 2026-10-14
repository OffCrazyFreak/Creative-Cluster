import RichTextView from "@/components/custom/rich-text/rich-text-view";
import EntryTextSection from "@/features/entry/components/entry-text-section";
import { m } from "@/paraglide/messages";
import type { RichTextDoc } from "@/typings/rich-text";

import {
  fromSerializableDoc,
  type ITranslationView,
  type TranslatedField,
} from "../translation-schemas";

interface ITranslatedSectionProps {
  id: string;
  title: string;
  field: TranslatedField;
  // The owner's original text, and its rich text when stored.
  text: string;
  doc?: RichTextDoc | null;
  sourceLocale: string;
  view: ITranslationView | null;
  showOriginal: boolean;
}

// Each text carries its own lang so screen readers switch voice and browsers hyphenate correctly.
export default function TranslatedSection({
  id,
  title,
  field,
  text,
  doc,
  sourceLocale,
  view,
  showOriginal,
}: ITranslatedSectionProps) {
  const translated = view?.texts[field];
  if (!translated || !view) {
    return (
      <EntryTextSection
        id={id}
        title={title}
        text={text}
        doc={doc}
        lang={sourceLocale}
      />
    );
  }
  const translatedDoc = fromSerializableDoc(translated.doc);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {translatedDoc ? (
        <RichTextView doc={translatedDoc} lang={view.locale} />
      ) : (
        <p lang={view.locale} className="whitespace-pre-line">
          {translated.text}
        </p>
      )}
      {showOriginal ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">
            {m.translation_original_heading()}
          </h3>
          {doc?.content?.length ? (
            <RichTextView doc={doc} lang={sourceLocale} />
          ) : (
            <p lang={sourceLocale} className="whitespace-pre-line">
              {text}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
