import type { ImageMime } from "@/constants/images";

import { ImageError } from "./image-error";

const JPEG_APP0 = 0xe0;
const JPEG_ICC = 0xe2;
const JPEG_ADOBE = 0xee;
const JPEG_APP15 = 0xef;
const JPEG_COMMENT = 0xfe;
const JPEG_START_OF_SCAN = 0xda;
const JPEG_END_OF_IMAGE = 0xd9;
const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
const WEBP_DROP = new Set(["EXIF", "XMP "]);
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

function malformed(): never {
  throw new ImageError("image_type");
}

// APP1 (EXIF, XMP), APP13 (IPTC), the other app segments and comments can carry GPS, names and device ids.
// JFIF, ICC and Adobe colour segments stay because they change how the pixels look.
function dropsJpegSegment(marker: number) {
  if (marker === JPEG_COMMENT) return true;
  if (marker <= JPEG_APP0 || marker > JPEG_APP15) return false;
  return marker !== JPEG_ICC && marker !== JPEG_ADOBE;
}

// Scan data escapes 0xFF as FF 00 and restarts with FF D0 to D7; any other marker ends the scan.
function scanEnd(bytes: Buffer, from: number) {
  let at = bytes.indexOf(0xff, from);
  while (at !== -1 && at + 1 < bytes.length) {
    const next = bytes[at + 1];
    const escaped = next === 0 || next === 0xff || (next & 0xf8) === 0xd0;
    if (!escaped) return at;
    at = bytes.indexOf(0xff, at + 1);
  }
  return bytes.length;
}

// Stops at the first end of image: phones append extra pictures and motion videos, each with its own EXIF.
function stripJpeg(bytes: Buffer): Buffer {
  const parts = [bytes.subarray(0, 2)];
  let at = 2;
  while (at + 2 <= bytes.length) {
    if (bytes[at] !== 0xff) malformed();
    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (marker === JPEG_END_OF_IMAGE) {
      parts.push(bytes.subarray(at, at + 2));
      break;
    }
    if (at + 4 > bytes.length) malformed();
    let end = at + 2 + bytes.readUInt16BE(at + 2);
    if (end > bytes.length) malformed();
    if (marker === JPEG_START_OF_SCAN) end = scanEnd(bytes, end);
    if (!dropsJpegSegment(marker)) parts.push(bytes.subarray(at, end));
    at = end;
  }
  return Buffer.concat(parts);
}

function stripPng(bytes: Buffer): Buffer {
  const parts = [bytes.subarray(0, 8)];
  let at = 8;
  while (at + 12 <= bytes.length) {
    const end = at + 12 + bytes.readUInt32BE(at);
    if (end > bytes.length) malformed();
    const type = bytes.toString("latin1", at + 4, at + 8);
    if (!PNG_DROP.has(type)) parts.push(bytes.subarray(at, end));
    if (type === "IEND") break;
    at = end;
  }
  return Buffer.concat(parts);
}

function stripWebp(bytes: Buffer): Buffer {
  const parts: Buffer[] = [];
  const limit = Math.min(bytes.length, 8 + bytes.readUInt32LE(4));
  let at = 12;
  while (at + 8 <= limit) {
    const size = bytes.readUInt32LE(at + 4);
    if (at + 8 + size > limit) malformed();
    // Some encoders leave out the pad byte after an odd-sized last chunk.
    const end = Math.min(at + 8 + size + (size % 2), limit);
    const type = bytes.toString("latin1", at, at + 4);
    if (!WEBP_DROP.has(type)) parts.push(Buffer.from(bytes.subarray(at, end)));
    if (type === "VP8X") {
      const chunk = parts[parts.length - 1];
      chunk[8] = chunk[8] & ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG);
    }
    at = end;
  }
  const body = Buffer.concat(parts);
  const header = Buffer.from(bytes.subarray(0, 12));
  header.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([header, body]);
}

// The browser re-encodes through a canvas, but a direct upload reaches the server with its metadata intact.
export function stripMetadata(bytes: Buffer, mime: ImageMime): Buffer {
  if (mime === "image/jpeg") return stripJpeg(bytes);
  if (mime === "image/png") return stripPng(bytes);
  return stripWebp(bytes);
}
