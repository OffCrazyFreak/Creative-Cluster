import { useQuery } from "@tanstack/react-query";

import { errorMessage } from "@/components/custom/form/error-message";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import type { AppLocale } from "@/constants/locales";
import { OPPORTUNITY_TAG_MAX } from "@/constants/opportunities";
import TagPicker from "@/features/tags/components/tag-picker";
import { useSuggestTag } from "@/features/tags/hooks/use-suggest-tag";
import { pickerTagsQuery } from "@/features/tags/tag-queries";
import { m } from "@/paraglide/messages";

interface IOpportunityTagFieldProps {
  locale: AppLocale;
  value: string[];
  onChange: (tagIds: string[]) => void;
  errors: unknown[];
}

export default function OpportunityTagField({
  locale,
  value,
  onChange,
  errors,
}: IOpportunityTagFieldProps) {
  const { data: tags = [] } = useQuery(pickerTagsQuery());
  const onSuggest = useSuggestTag(locale);

  const messages = errors.flatMap((error) => {
    const message = errorMessage(error);
    return message ? [{ message }] : [];
  });

  return (
    <Field data-field="tagIds" data-invalid={messages.length > 0}>
      <FieldLabel htmlFor="tagIds">{m.opportunities_field_tags()}</FieldLabel>
      <TagPicker
        id="tagIds"
        tags={tags}
        value={value}
        onValueChange={onChange}
        onSuggest={onSuggest}
        max={OPPORTUNITY_TAG_MAX}
      />
      <FieldDescription>
        {m.opportunities_field_tags_hint({ max: OPPORTUNITY_TAG_MAX })}
      </FieldDescription>
      {messages.length > 0 && <FieldError errors={messages} />}
    </Field>
  );
}
