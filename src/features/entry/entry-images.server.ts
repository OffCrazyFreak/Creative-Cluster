import { inArray } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";
import { image } from "@/db/schema";

import type { IEntryImages } from "./redact-entry";

interface IImageIds {
  logoImageId: string | null;
  coverImageId: string | null;
}

// Never selects `bytes`: the image row is large and only the /img route reads it.
export async function loadEntryImages(
  db: DbOrTx,
  ids: IImageIds,
): Promise<IEntryImages> {
  const wanted = [ids.logoImageId, ids.coverImageId].filter(
    (id): id is string => id !== null,
  );
  if (wanted.length === 0) return { logo: null, cover: null };
  const rows = await db
    .select({
      id: image.id,
      hash: image.contentHash,
      width: image.width,
      height: image.height,
      altText: image.altText,
    })
    .from(image)
    .where(inArray(image.id, wanted));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    logo: (ids.logoImageId && byId.get(ids.logoImageId)) || null,
    cover: (ids.coverImageId && byId.get(ids.coverImageId)) || null,
  };
}
