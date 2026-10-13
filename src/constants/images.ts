export const IMAGE_MAX_BYTES = 1_000_000;
// Raw file picked by the user, before it is cropped and re-encoded in the browser.
export const IMAGE_INPUT_MAX_BYTES = 25_000_000;
export const IMAGE_ALT_MAX_LENGTH = 200;

export const IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type ImageMime = (typeof IMAGE_ACCEPTED_TYPES)[number];

export const IMAGE_KINDS = ["logo", "cover"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

// Stored size: logo 1:1 at 256 px (shown at 128), cover 16:9 at 1200 px.
export const IMAGE_SPECS: Record<
  ImageKind,
  { aspect: number; width: number; height: number }
> = {
  logo: { aspect: 1, width: 256, height: 256 },
  cover: { aspect: 16 / 9, width: 1200, height: 675 },
};

export const IMAGE_MIN_SIDE = 32;
export const IMAGE_ASPECT_TOLERANCE = 0.02;

export const IMAGE_UPLOAD_LIMIT = { max: 30, windowSeconds: 3600 };

export const IMAGE_FILE_PATTERN = /^([0-9a-f]{64})(\.[a-z]{3,4})?$/;
