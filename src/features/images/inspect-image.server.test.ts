import { describe, expect, it } from "vitest";

import { imageErrorCode } from "./image-error";
import { inspectImage } from "./inspect-image.server";

function png(width: number, height: number) {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt8(8, 24);
  bytes.writeUInt8(6, 25);
  return bytes;
}

function jpeg(width: number, height: number) {
  const app0 = Buffer.from([
    0xff,
    0xe0,
    0x00,
    0x10,
    ...new Array<number>(14).fill(0),
  ]);
  const sof = Buffer.alloc(11);
  Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]).copy(sof);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof.writeUInt8(3, 9);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app0,
    sof,
    Buffer.alloc(20),
  ]);
}

function webp(width: number, height: number) {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBPVP8X", 8);
  bytes.writeUInt32LE(10, 16);
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

function codeOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return imageErrorCode(error);
  }
  return "none";
}

describe("inspectImage", () => {
  it("reads type and size from the bytes", () => {
    expect(inspectImage(png(256, 256), "logo")).toEqual({
      mime: "image/png",
      width: 256,
      height: 256,
    });
    expect(inspectImage(jpeg(1200, 675), "cover").mime).toBe("image/jpeg");
    expect(inspectImage(webp(128, 128), "logo").mime).toBe("image/webp");
  });

  it("rejects SVG, GIF, text and truncated files", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const gif = Buffer.from("GIF89a\x01\x00\x01\x00", "binary");
    for (const bytes of [svg, gif, Buffer.from("hello"), Buffer.alloc(0)]) {
      expect(codeOf(() => inspectImage(bytes, "logo"))).toBe("image_type");
    }
    expect(
      codeOf(() => inspectImage(png(256, 256).subarray(0, 14), "logo")),
    ).toBe("image_type");
  });

  it("rejects wrong shape and oversized dimensions", () => {
    expect(codeOf(() => inspectImage(png(256, 128), "logo"))).toBe(
      "image_dimensions",
    );
    expect(codeOf(() => inspectImage(png(512, 512), "logo"))).toBe(
      "image_dimensions",
    );
    expect(codeOf(() => inspectImage(png(8, 8), "logo"))).toBe(
      "image_dimensions",
    );
    expect(codeOf(() => inspectImage(jpeg(1200, 900), "cover"))).toBe(
      "image_dimensions",
    );
    expect(codeOf(() => inspectImage(jpeg(4000, 2250), "cover"))).toBe(
      "image_dimensions",
    );
  });
});
