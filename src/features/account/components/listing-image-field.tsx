import { memo } from "react";

import { errorMessage } from "@/components/custom/form/error-message";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IMAGE_ALT_MAX_LENGTH, type ImageKind } from "@/constants/images";
import ImageUploadField from "@/features/images/components/image-upload-field";
import { m } from "@/paraglide/messages";
import type { IImageFieldValue } from "@/typings/images";

interface IListingImageFieldProps {
  id: string;
  kind: ImageKind;
  label: string;
  entryName: string;
  value: IImageFieldValue | null;
  onChange: (image: IImageFieldValue | null) => void;
  errors: unknown[];
}

// The alt text belongs to the entry, so it stays editable after the upload; empty means the entry name.
function ListingImageField({
  id,
  kind,
  label,
  entryName,
  value,
  onChange,
  errors,
}: IListingImageFieldProps) {
  const messages = errors.map((error) => ({ message: errorMessage(error) }));
  return (
    <div className="flex flex-col gap-3" data-field={id}>
      <ImageUploadField
        kind={kind}
        label={label}
        entryName={entryName}
        value={value}
        onChange={onChange}
      />
      {value && (
        <Field data-invalid={messages.length > 0}>
          <FieldLabel htmlFor={`${id}-alt`}>{m.account_field_alt()}</FieldLabel>
          <Input
            id={`${id}-alt`}
            value={value.altText}
            maxLength={IMAGE_ALT_MAX_LENGTH}
            aria-invalid={messages.length > 0}
            aria-describedby={`${id}-alt-hint`}
            onChange={(event) =>
              onChange({ ...value, altText: event.target.value })
            }
          />
          <FieldDescription id={`${id}-alt-hint`}>
            {m.account_field_alt_hint()}
          </FieldDescription>
          <FieldError errors={messages} />
        </Field>
      )}
      {!value && messages.length > 0 && <FieldError errors={messages} />}
    </div>
  );
}

export default memo(ListingImageField);
