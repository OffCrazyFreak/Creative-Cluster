import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

// Checked 2026-10-13: the Atom feed lists this zip; the feed carries the dataset's update time.
const FEED_URL = "https://geoportal.dgu.hr/services/atom/ad/xml";
const ZIP_URL =
  "https://geoportal.dgu.hr/services/atom/INSPIRE_Addresses_(AD).zip";

export interface IDownload {
  zipPath: string;
  updated: string;
  fresh: boolean;
}

export function parseFeedUpdated(feed: string): string {
  const entry = /<entry>[\s\S]*?<\/entry>/.exec(feed)?.[0] ?? "";
  const updated = /<updated>([^<]+)<\/updated>/.exec(entry)?.[1];
  if (!updated) throw new Error("DGU feed has no entry update time");
  return updated;
}

async function readMeta(path: string): Promise<{ updated?: string }> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as { updated?: string };
  } catch {
    return {};
  }
}

// The zip is regenerated weekly and the server sends no Last-Modified, so the feed time is the cache key.
export async function downloadDguZip(
  cacheDir: string,
  force = false,
): Promise<IDownload> {
  await mkdir(cacheDir, { recursive: true });
  const zipPath = join(cacheDir, "INSPIRE_Addresses_AD.zip");
  const metaPath = join(cacheDir, "INSPIRE_Addresses_AD.json");

  const feed = await fetch(FEED_URL, { signal: AbortSignal.timeout(30_000) });
  if (!feed.ok) throw new Error(`DGU feed answered ${feed.status}`);
  const updated = parseFeedUpdated(await feed.text());

  if (!force && (await readMeta(metaPath)).updated === updated) {
    if ((await stat(zipPath).catch(() => null))?.size) {
      return { zipPath, updated, fresh: false };
    }
  }

  const response = await fetch(ZIP_URL);
  if (!response.ok || !response.body)
    throw new Error(`DGU zip answered ${response.status}`);
  const partial = `${zipPath}.part`;
  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream),
    createWriteStream(partial),
  );
  await rename(partial, zipPath);
  await writeFile(metaPath, JSON.stringify({ updated }));
  return { zipPath, updated, fresh: true };
}
