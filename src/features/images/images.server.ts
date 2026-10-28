import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  IMAGE_MAX_BYTES,
  IMAGE_UPLOAD_LIMIT,
  type ImageKind,
} from "@/constants/images";
import { db } from "@/db/client.server";
import { image } from "@/db/schema";
import { hitLimit } from "@/lib/limits/check-limit.server";
import type { IUploadedImage } from "@/typings/images";

import { ImageError } from "./image-error";
import { inspectImage } from "./inspect-image.server";
import { stripMetadata } from "./strip-metadata.server";

interface IStoreImageInput {
  userId: string;
  file: File;
  kind: ImageKind;
}

// Stores bytes only; attaching the image to an entry (and who may) is the owner area's job.
// The body is already parsed when this runs (Start reads the whole multipart request before any
// middleware), so the platform's request size cap is the first line and these checks are the second.
export async function storeImage({
  userId,
  file,
  kind,
}: IStoreImageInput): Promise<IUploadedImage> {
  if (
    !(await hitLimit({ key: `image-upload:${userId}`, ...IMAGE_UPLOAD_LIMIT }))
  ) {
    throw new ImageError("image_limit");
  }
  if (file.size === 0 || file.size > IMAGE_MAX_BYTES) {
    throw new ImageError("image_too_big");
  }
  const upload = Buffer.from(await file.arrayBuffer());
  const { mime, width, height } = inspectImage(upload, kind);
  const bytes = stripMetadata(upload, mime);
  const hash = createHash("sha256").update(bytes).digest("hex");

  const [inserted] = await db
    .insert(image)
    .values({
      bytes,
      mime,
      width,
      height,
      size: bytes.length,
      contentHash: hash,
    })
    .onConflictDoNothing({ target: image.contentHash })
    .returning({ id: image.id });
  if (inserted) return { id: inserted.id, hash, width, height };

  const [existing] = await db
    .select({ id: image.id })
    .from(image)
    .where(eq(image.contentHash, hash));
  // A row deleted between the insert and the select; the client may simply try again.
  if (!existing) throw new ImageError("image_retry");
  return { id: existing.id, hash, width, height };
}

// Light lookup first so a conditional request never loads the bytes.
export async function findImageMeta(id: string, hash: string) {
  const [row] = await db
    .select({ mime: image.mime, size: image.size })
    .from(image)
    .where(and(eq(image.id, id), eq(image.contentHash, hash)));
  return row ?? null;
}

export async function findImageBytes(id: string, hash: string) {
  const [row] = await db
    .select({ bytes: image.bytes })
    .from(image)
    .where(and(eq(image.id, id), eq(image.contentHash, hash)));
  return row?.bytes ?? null;
}
