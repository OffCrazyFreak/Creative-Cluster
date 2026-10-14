// The message is the code: it is what survives the trip from the server function to the browser.
export const IMAGE_ERROR_CODES = [
  "image_type",
  "image_too_big",
  "image_dimensions",
  "image_limit",
  "image_retry",
] as const;
export type ImageErrorCode = (typeof IMAGE_ERROR_CODES)[number];

export class ImageError extends Error {
  code: ImageErrorCode;

  constructor(code: ImageErrorCode) {
    super(code);
    this.name = "ImageError";
    this.code = code;
  }
}

export function imageErrorCode(error: unknown): ImageErrorCode | null {
  const message = error instanceof Error ? error.message : "";
  return IMAGE_ERROR_CODES.find((code) => code === message) ?? null;
}
