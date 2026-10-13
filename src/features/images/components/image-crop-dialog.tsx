import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import {
  IMAGE_ALT_MAX_LENGTH,
  IMAGE_SPECS,
  type ImageKind,
} from "@/constants/images";
import type { ICropArea } from "@/lib/images/prepare-image";
import { m } from "@/paraglide/messages";

interface IImageCropDialogProps {
  file: File;
  kind: ImageKind;
  defaultAlt: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (result: { area: ICropArea; altText: string }) => void;
}

export default function ImageCropDialog({
  file,
  kind,
  defaultAlt,
  busy,
  error,
  onCancel,
  onConfirm,
}: IImageCropDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<ICropArea | null>(null);
  const [altText, setAltText] = useState(defaultAlt);

  useEffect(() => {
    // Created here so the cleanup revokes exactly the URL this effect made.
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Dialog
      open
      onOpenChange={(open) => (open || busy ? undefined : onCancel())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.images_crop_title()}</DialogTitle>
          <DialogDescription>{m.images_crop_description()}</DialogDescription>
        </DialogHeader>
        <div className="relative h-64 w-full">
          {url ? (
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              aspect={IMAGE_SPECS[kind].aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          ) : null}
        </div>
        <Field>
          <FieldLabel id="image-zoom-label">{m.images_zoom()}</FieldLabel>
          <Slider
            aria-labelledby="image-zoom-label"
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={(value) =>
              setZoom(typeof value === "number" ? value : (value[0] ?? 1))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="image-alt-text">
            {m.images_alt_label()}
          </FieldLabel>
          <Input
            id="image-alt-text"
            value={altText}
            maxLength={IMAGE_ALT_MAX_LENGTH}
            onChange={(event) => setAltText(event.target.value)}
          />
          <FieldDescription>{m.images_alt_hint()}</FieldDescription>
        </Field>
        {error ? <FieldError role="alert">{error}</FieldError> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
          >
            {m.common_cancel()}
          </Button>
          <Button
            type="button"
            disabled={busy || !area}
            onClick={() => area && onConfirm({ area, altText: altText.trim() })}
          >
            {busy ? <Spinner aria-label={m.images_working()} /> : null}
            {m.images_use()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
