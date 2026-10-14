import { Field, FieldLabel } from "@/components/ui/field";
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
}

// The alt text belongs to the entry, so it stays editable after the upload.
export default function ListingImageField({
  id,
  kind,
  label,
  entryName,
  value,
  onChange,
}: IListingImageFieldProps) {
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
        <Field>
          <FieldLabel htmlFor={`${id}-alt`}>{m.account_field_alt()}</FieldLabel>
          <Input
            id={`${id}-alt`}
            value={value.altText}
            maxLength={IMAGE_ALT_MAX_LENGTH}
            onChange={(event) =>
              onChange({ ...value, altText: event.target.value })
            }
          />
        </Field>
      )}
    </div>
  );
}
