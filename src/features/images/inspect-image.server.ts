import { imageSize } from "image-size";

import {
  IMAGE_ASPECT_TOLERANCE,
  IMAGE_MIN_SIDE,
  IMAGE_SPECS,
  type ImageKind,
} from "@/constants/images";
import { sniffImageType } from "@/lib/images/sniff-image-type";

import { ImageError } from "./image-error";

// image-size names JPEG "jpg"; compare on the MIME subtype.
function declaredSubtype(type: string | undefined) {
  return type === "jpg" ? "jpeg" : type;
}

function checkDimensions(width: number, height: number, kind: ImageKind) {
  const spec = IMAGE_SPECS[kind];
  const aspect = width / height;
  const fits =
    width >= IMAGE_MIN_SIDE &&
    height >= IMAGE_MIN_SIDE &&
    width <= spec.width &&
    height <= spec.height &&
    Math.abs(aspect - spec.aspect) <= spec.aspect * IMAGE_ASPECT_TOLERANCE;
  if (!fits) throw new ImageError("image_dimensions");
}

export function inspectImage(bytes: Buffer, kind: ImageKind) {
  const mime = sniffImageType(bytes);
  if (!mime) throw new ImageError("image_type");
  let size;
  try {
    size = imageSize(bytes);
  } catch {
    throw new ImageError("image_type");
  }
  if (declaredSubtype(size.type) !== mime.slice("image/".length)) {
    throw new ImageError("image_type");
  }
  checkDimensions(size.width, size.height, kind);
  return { mime, width: size.width, height: size.height };
}
