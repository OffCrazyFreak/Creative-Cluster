import { useState } from "react";

import {
  imageUrl,
  isCloudinaryEnabled,
  ownImageUrl,
} from "@/lib/images/image-url";
import type { IImageRef } from "@/typings/images";

interface IEntryImageProps {
  image: IImageRef;
  // Empty string marks a purely decorative image.
  alt: string;
  // Displayed size in CSS pixels; fixed so the page never shifts while it loads.
  width: number;
  height: number;
  className?: string;
  // Only for the single image that is the largest paint above the fold.
  eager?: boolean;
}

export default function EntryImage({
  image,
  alt,
  width,
  height,
  className,
  eager,
}: IEntryImageProps) {
  const [failedHash, setFailedHash] = useState<string | null>(null);
  const useOwn = failedHash === image.hash || !isCloudinaryEnabled();
  const src = useOwn ? ownImageUrl(image) : imageUrl({ ...image, width });
  const srcSet = useOwn
    ? undefined
    : `${src} 1x, ${imageUrl({ ...image, width: width * 2 })} 2x`;

  return (
    <img
      src={src}
      srcSet={srcSet}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onError={() => setFailedHash(image.hash)}
    />
  );
}
