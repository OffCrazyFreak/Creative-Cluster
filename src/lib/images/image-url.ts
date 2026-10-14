import { clientEnv } from "@/env.client";
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

// Cloudinary "fetch" delivery: it pulls our own /img URL, converts and caches it on its CDN.
// c_limit keeps a 2x request from upscaling past the stored size. The source is always the public
// site origin because Cloudinary only fetches from our two allowed production hosts; elsewhere the
// cloud name is unset, and onError in EntryImage falls back to our own URL.
export function cloudinaryImageUrl({
  cloudName,
  origin,
  width,
  ...image
}: ICloudinaryOptions): string {
  const source = `${origin}${ownImageUrl(image)}`;
  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto,c_limit,w_${width}/${source}`;
}

export function isCloudinaryEnabled(): boolean {
  return Boolean(clientEnv.VITE_CLOUDINARY_CLOUD_NAME);
}

// Falls back to our own URL when Cloudinary is not configured (local dev, before the account exists).
export function imageUrl({
  id,
  hash,
  width,
}: IImageRef & { width: number }): string {
  const cloudName = clientEnv.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return ownImageUrl({ id, hash });
  return cloudinaryImageUrl({
    cloudName,
    origin: site.origin,
    id,
    hash,
    width,
  });
}
