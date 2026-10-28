import { eq } from "drizzle-orm";
import { imageSize } from "image-size";
import { afterAll, describe, expect, it, vi } from "vitest";

import { image } from "@/db/schema";

import { stripMetadata } from "./strip-metadata.server";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("images") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { storeImage } = await import("./images.server");

const GPS = Buffer.from("GPS 45.81 15.97 secret");

function segment(marker: number, payload: Buffer) {
  const head = Buffer.from([0xff, marker, 0, 0]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
}

function jpegWithExif(width = 200, height = 100) {
  const sof = Buffer.from([8, 0, 0, 0, 0, 1, 1, 0x11, 0]);
  sof.writeUInt16BE(height, 1);
  sof.writeUInt16BE(width, 3);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.from("JFIF\0\x01\x01\0\0\x01\0\x01\0\0", "latin1")),
    segment(0xe1, Buffer.concat([Buffer.from("Exif\0\0"), GPS])),
    segment(0xe2, Buffer.from("ICC_PROFILE\0")),
    segment(0xfe, GPS),
    segment(0xc0, sof),
    segment(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
    Buffer.from([0x12, 0x34, 0xff, 0xd9]),
  ]);
}

function pngChunk(type: string, data: Buffer) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "latin1");
  return Buffer.concat([head, data, Buffer.alloc(4)]);
}

function png() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(200, 0);
  ihdr.writeUInt32BE(100, 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("eXIf", GPS),
    pngChunk("tEXt", GPS),
    pngChunk("IDAT", Buffer.from([1, 2, 3])),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function webpChunk(type: string, data: Buffer) {
  const head = Buffer.alloc(8);
  head.write(type, 0, "latin1");
  head.writeUInt32LE(data.length, 4);
  const pad = Buffer.alloc(data.length % 2);
  return Buffer.concat([head, data, pad]);
}

function webp() {
  const vp8x = Buffer.alloc(10);
  vp8x[0] = 0x08 | 0x04;
  vp8x.writeUIntLE(199, 4, 3);
  vp8x.writeUIntLE(99, 7, 3);
  const body = Buffer.concat([
    webpChunk("VP8X", vp8x),
    webpChunk("VP8L", Buffer.from([0x2f, 0, 0, 0, 0])),
    webpChunk("EXIF", GPS),
    webpChunk("XMP ", GPS),
  ]);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0);
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8);
  return Buffer.concat([header, body]);
}

describe("stripMetadata", () => {
  it("drops EXIF and comments from a JPEG and keeps the colour profile and image data", () => {
    const out = stripMetadata(jpegWithExif(), "image/jpeg");
    expect(out.includes(GPS)).toBe(false);
    expect(out.includes(Buffer.from("Exif"))).toBe(false);
    expect(out.includes(Buffer.from("ICC_PROFILE"))).toBe(true);
    expect(out.subarray(-4)).toEqual(Buffer.from([0x12, 0x34, 0xff, 0xd9]));
    expect(imageSize(out)).toMatchObject({ width: 200, height: 100 });
  });

  it("drops eXIf and text chunks from a PNG", () => {
    const out = stripMetadata(png(), "image/png");
    expect(out.includes(GPS)).toBe(false);
    expect(out.includes(Buffer.from("IDAT"))).toBe(true);
    expect(imageSize(out)).toMatchObject({ width: 200, height: 100 });
  });

  it("drops EXIF and XMP chunks from a WebP and fixes the header", () => {
    const out = stripMetadata(webp(), "image/webp");
    expect(out.includes(GPS)).toBe(false);
    expect(out.readUInt32LE(4)).toBe(out.length - 8);
    expect(out[20] & 0x0c).toBe(0);
    expect(imageSize(out)).toMatchObject({ width: 200, height: 100 });
  });

  it("drops comments between JPEG scans and anything after the end of the image", () => {
    const first = jpegWithExif();
    const progressive = Buffer.concat([
      first.subarray(0, -2),
      segment(0xfe, GPS),
      segment(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
      Buffer.from([0x56, 0xff, 0x00, 0xff, 0xd0, 0x78, 0xff, 0xd9]),
      jpegWithExif(),
    ]);
    const out = stripMetadata(progressive, "image/jpeg");
    expect(out.includes(GPS)).toBe(false);
    expect(out.subarray(-8)).toEqual(
      Buffer.from([0x56, 0xff, 0x00, 0xff, 0xd0, 0x78, 0xff, 0xd9]),
    );
  });

  it("accepts and drops bytes after the end of a PNG or WebP", () => {
    const junk = Buffer.concat([Buffer.alloc(16, 0xff), GPS]);
    const strippedPng = stripMetadata(
      Buffer.concat([png(), junk]),
      "image/png",
    );
    expect(strippedPng).toEqual(stripMetadata(png(), "image/png"));
    const strippedWebp = stripMetadata(
      Buffer.concat([webp(), junk]),
      "image/webp",
    );
    expect(strippedWebp).toEqual(stripMetadata(webp(), "image/webp"));
  });

  it("leaves an image without metadata unchanged", () => {
    const clean = stripMetadata(png(), "image/png");
    expect(stripMetadata(clean, "image/png")).toEqual(clean);
  });
});

describe.skipIf(!temp)("storeImage", () => {
  afterAll(async () => {
    await temp?.drop();
  });

  it("stores a directly uploaded JPEG without its EXIF", async () => {
    const file = new File([jpegWithExif(256, 256)], "logo.jpg");
    const stored = await storeImage({ userId: "u1", file, kind: "logo" });
    const [row] = await temp!.db
      .select({ bytes: image.bytes })
      .from(image)
      .where(eq(image.id, stored.id));
    expect(row.bytes.includes(GPS)).toBe(false);
  });
});
