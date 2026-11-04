import { site } from "@/sites";
import type { IImageRef } from "@/typings/images";

export function ownImageUrl({ id, hash }: IImageRef): string {
  return `/img/${id}/${hash}.webp`;
}

interface ICloudinaryOptions extends IImageRef {
  cloudName: string;
  origin: string;
  width: number;
}

// The source is always the public origin because Cloudinary fetches only from our two hosts; c_limit stops 2x upscaling.
export function cloudinaryImageUrl({
  cloudName,
  origin,
  width,
  ...image
}: ICloudinaryOptions): string {
  const source = `${origin}${ownImageUrl(image)}`;
  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto,c_limit,w_${width}/${source}`;
}

// env.client.ts on the server is a mock with truthy properties, which would send server-rendered images to a bogus Cloudinary URL.
function cloudName(): string | undefined {
  return (
    (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ||
    undefined
  );
}

export function isCloudinaryEnabled(): boolean {
  return Boolean(cloudName());
}

// Falls back to our own URL when Cloudinary is not configured (local dev, before the account exists).
export function imageUrl({
  id,
  hash,
  width,
}: IImageRef & { width: number }): string {
  const name = cloudName();
  if (!name) return ownImageUrl({ id, hash });
  return cloudinaryImageUrl({
    cloudName: name,
    origin: site.origin,
    id,
    hash,
    width,
  });
}

// Social cards want an absolute 1200x630 crop; JPEG because not every crawler reads AVIF or WebP.
export function socialImageUrl(image: IImageRef, name = cloudName()): string {
  const source = `${site.origin}${ownImageUrl(image)}`;
  if (!name) return source;
  return `https://res.cloudinary.com/${name}/image/fetch/f_jpg,q_auto,c_fill,w_1200,h_630/${source}`;
}
