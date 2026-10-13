import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  IMAGE_ACCEPTED_TYPES,
  IMAGE_MIN_SIDE,
  IMAGE_INPUT_MAX_BYTES,
  IMAGE_SPECS,
  type ImageKind,
} from "@/constants/images";
import {
  ImagePrepareError,
  assertImageDimensions,
  assertImageFile,
  prepareImage,
  type ICropArea,
} from "@/lib/images/prepare-image";
import { m } from "@/paraglide/messages";
import type { IImageFieldValue } from "@/typings/images";

import { imageErrorCode } from "../image-error";
import { uploadImageMutationOptions } from "../images-queries";

import EntryImage from "./entry-image";
import ImageCropDialog from "./image-crop-dialog";

export interface IImageUploadFieldProps {
  kind: ImageKind;
  // Default alt text; use the entry name.
  entryName: string;
  label: string;
  value: IImageFieldValue | null;
  onChange: (image: IImageFieldValue | null) => void;
  disabled?: boolean;
}

const PREVIEW_WIDTH = 128;

function messageFor(error: unknown): string {
  if (error instanceof ImagePrepareError) {
    if (error.code === "type") return m.images_error_type();
    if (error.code === "input_too_big") {
      return m.images_error_too_big({
        size: IMAGE_INPUT_MAX_BYTES / 1_000_000,
      });
    }
    if (error.code === "too_small") {
      return m.images_error_too_small({ size: IMAGE_MIN_SIDE });
    }
    if (error.code === "output_too_big") {
      return m.images_error_too_big({ size: 1 });
    }
    return m.images_error_decode();
  }
  const code = imageErrorCode(error);
  if (code === "image_type") return m.images_error_type();
  if (code === "image_limit") return m.images_error_limit();
  if (code === "image_dimensions") return m.images_error_dimensions();
  if (code === "image_too_big") return m.images_error_too_big({ size: 1 });
  return m.images_error_upload();
}

export default function ImageUploadField({
  kind,
  entryName,
  label,
  value,
  onChange,
  disabled,
}: IImageUploadFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const run = useRef(0);
  const inFlight = useRef(false);
  const upload = useMutation(uploadImageMutationOptions());
  const spec = IMAGE_SPECS[kind];
  const previewHeight = Math.round(PREVIEW_WIDTH / spec.aspect);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    try {
      await assertImageFile(picked);
      await assertImageDimensions(picked);
      setError(null);
      setFile(picked);
    } catch (caught) {
      setError(messageFor(caught));
    }
  }

  function cancel() {
    run.current += 1;
    inFlight.current = false;
    setFile(null);
    setWorking(false);
    setError(null);
  }

  async function confirm(result: { area: ICropArea; altText: string }) {
    if (!file || inFlight.current) return;
    inFlight.current = true;
    const id = (run.current += 1);
    setWorking(true);
    setError(null);
    try {
      const blob = await prepareImage(file, result.area, kind);
      const form = new FormData();
      form.set("file", new File([blob], "image", { type: blob.type }));
      form.set("kind", kind);
      const uploaded = await upload.mutateAsync(form);
      // Cancelled while preparing or uploading: the image is stored but never attached.
      if (id !== run.current) return;
      onChange({ ...uploaded, altText: result.altText || entryName });
      setFile(null);
    } catch (caught) {
      if (id === run.current) setError(messageFor(caught));
    } finally {
      if (id === run.current) {
        inFlight.current = false;
        setWorking(false);
      }
    }
  }

  return (
    <Field data-invalid={Boolean(error && !file)}>
      <FieldLabel htmlFor={`image-upload-${kind}`}>{label}</FieldLabel>
      {value ? (
        <EntryImage
          image={value}
          alt={value.altText}
          width={PREVIEW_WIDTH}
          height={previewHeight}
        />
      ) : (
        <FieldDescription>{m.images_none()}</FieldDescription>
      )}
      <Input
        id={`image-upload-${kind}`}
        type="file"
        accept={IMAGE_ACCEPTED_TYPES.join(",")}
        disabled={disabled || working}
        onChange={(event) => void pick(event)}
      />
      <FieldDescription>{m.images_hint()}</FieldDescription>
      {value ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          {m.images_remove()}
        </Button>
      ) : null}
      {error && !file ? <FieldError role="alert">{error}</FieldError> : null}
      {file ? (
        <ImageCropDialog
          file={file}
          kind={kind}
          defaultAlt={entryName}
          busy={working}
          error={error}
          onCancel={cancel}
          onConfirm={(result) => void confirm(result)}
        />
      ) : null}
    </Field>
  );
}
