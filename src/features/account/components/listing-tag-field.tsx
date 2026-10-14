import { useQuery } from "@tanstack/react-query";

import { MAX_TAGS_PER_FIELD } from "@/constants/tags";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import TagPicker from "@/features/tags/components/tag-picker";
import { useSuggestTag } from "@/features/tags/hooks/use-suggest-tag";
import { pickerTagsQuery } from "@/features/tags/tag-queries";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

interface IListingTagFieldProps {
  id: string;
  label: string;
  value: string[];
  onChange: (tagIds: string[]) => void;
}

export default function ListingTagField({
  id,
  label,
  value,
  onChange,
}: IListingTagFieldProps) {
  const { data: tags = [] } = useQuery(pickerTagsQuery());
  const onSuggest = useSuggestTag(getLocale());

  return (
    <Field data-field={id}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <TagPicker
        id={id}
        tags={tags}
        value={value}
        onValueChange={onChange}
        onSuggest={onSuggest}
      />
      <FieldDescription>
        {m.account_field_tags_hint({ max: MAX_TAGS_PER_FIELD })}
      </FieldDescription>
    </Field>
  );
}
