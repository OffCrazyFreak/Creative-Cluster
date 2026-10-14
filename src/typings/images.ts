export interface IImageRef {
  id: string;
  hash: string;
}

// What the upload returns; the owner area stores `id` (and reads the hash back from the image row for URLs).
export interface IUploadedImage extends IImageRef {
  width: number;
  height: number;
}

// Value of ImageUploadField: the alt text belongs to the entry, not to the shared image row.
export interface IImageFieldValue extends IUploadedImage {
  altText: string;
}
