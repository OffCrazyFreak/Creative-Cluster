import RichTextEditor from "@/components/custom/rich-text/rich-text-editor";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages";
import type { RichTextDoc } from "@/typings/rich-text";

import {
  DESCRIPTION_MAX_CHARS,
  SHORT_TEXT_MAX_CHARS,
  type ITranslationView,
  type TranslatedField,
} from "../translation-fields";

export interface IEditValues {
  description: RichTextDoc | null;
  offering: string;
  seeking: string;
}

interface ITranslationEditFieldsProps {
  view: ITranslationView;
  values: IEditValues;
  onChange: (field: TranslatedField, value: RichTextDoc | string) => void;
}

const titles = {
  description: () => m.entry_section_about(),
  offering: () => m.entry_section_offering(),
  seeking: () => m.entry_section_seeking(),
};

export default function TranslationEditFields({
  view,
  values,
  onChange,
}: ITranslationEditFieldsProps) {
  return (
    <>
      {view.sourceFields.includes("description") ? (
        <Field>
          <FieldLabel>{titles.description()}</FieldLabel>
          <RichTextEditor
            value={values.description}
            onChange={(doc) => onChange("description", doc)}
            maxChars={DESCRIPTION_MAX_CHARS}
            label={titles.description()}
            lang={view.locale}
          />
        </Field>
      ) : null}
      {(["offering", "seeking"] as const).map((field) =>
        view.sourceFields.includes(field) ? (
          <Field key={field}>
            <FieldLabel htmlFor={`translation-${field}`}>
              {titles[field]()}
            </FieldLabel>
            <Textarea
              id={`translation-${field}`}
              value={values[field]}
              maxLength={SHORT_TEXT_MAX_CHARS}
              onChange={(event) => onChange(field, event.target.value)}
            />
          </Field>
        ) : null,
      )}
    </>
  );
}
