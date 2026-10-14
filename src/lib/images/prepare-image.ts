import {
  IMAGE_INPUT_MAX_BYTES,
  IMAGE_MAX_BYTES,
  IMAGE_MIN_SIDE,
  IMAGE_SPECS,
  type ImageKind,
} from "@/constants/images";

import { sniffImageType } from "./sniff-image-type";

export type ImagePrepareErrorCode =
  "type" | "input_too_big" | "too_small" | "decode" | "output_too_big";

export class ImagePrepareError extends Error {
  code: ImagePrepareErrorCode;

  constructor(code: ImagePrepareErrorCode) {
    super(code);
    this.name = "ImagePrepareError";
    this.code = code;
  }
}

export interface ICropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const QUALITIES = [0.86, 0.72, 0.58, 0.45];

// Declared MIME types and file names are user-controlled; the first bytes are not.
export async function assertImageFile(file: File): Promise<void> {
  if (file.size > IMAGE_INPUT_MAX_BYTES) {
    throw new ImagePrepareError("input_too_big");
  }
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!sniffImageType(head)) throw new ImagePrepareError("type");
}

// Rejects images the server would refuse anyway, with a message that says why.
export async function assertImageDimensions(file: File): Promise<void> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepareError("decode");
  }
  const tooSmall = Math.min(bitmap.width, bitmap.height) < IMAGE_MIN_SIDE;
  bitmap.close();
  if (tooSmall) throw new ImagePrepareError("too_small");
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

function drawCrop(
  bitmap: ImageBitmap,
  area: ICropArea,
  size: { width: number; height: number },
  background?: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new ImagePrepareError("decode");
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, size.width, size.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    bitmap,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size.width,
    size.height,
  );
  return canvas;
}

async function encode(canvas: HTMLCanvasElement, type: string) {
  for (const quality of QUALITIES) {
    const blob = await toBlob(canvas, type, quality);
    // Browsers without WebP encoding silently return PNG; callers check the type.
    if (!blob || blob.type !== type) return null;
    if (blob.size <= IMAGE_MAX_BYTES) return blob;
  }
  throw new ImagePrepareError("output_too_big");
}

// Crops (in pixels of the EXIF-oriented image), scales down to the stored size and encodes WebP, else JPEG.
// Canvas re-encoding drops EXIF and other metadata.
export async function prepareImage(
  file: File,
  area: ICropArea,
  kind: ImageKind,
): Promise<Blob> {
  await assertImageFile(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepareError("decode");
  }
  try {
    const spec = IMAGE_SPECS[kind];
    const width = Math.min(spec.width, Math.round(area.width));
    const size = { width, height: Math.round(width / spec.aspect) };
    const webp = await encode(drawCrop(bitmap, area, size), "image/webp");
    if (webp) return webp;
    // JPEG has no alpha, so transparent logos get a white background.
    const jpeg = await encode(
      drawCrop(bitmap, area, size, "#ffffff"),
      "image/jpeg",
    );
    if (jpeg) return jpeg;
    throw new ImagePrepareError("decode");
  } finally {
    bitmap.close();
  }
}
