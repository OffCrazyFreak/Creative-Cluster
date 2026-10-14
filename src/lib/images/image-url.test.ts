import { describe, expect, it } from "vitest";

import { cloudinaryImageUrl, ownImageUrl, socialImageUrl } from "./image-url";
import { sniffImageType } from "./sniff-image-type";

const image = {
  id: "0192f0aa-0000-7000-8000-000000000001",
  hash: "a".repeat(64),
};

describe("image urls", () => {
  it("builds our own immutable URL", () => {
    expect(ownImageUrl(image)).toBe(`/img/${image.id}/${image.hash}.webp`);
  });

  it("wraps our absolute URL in a Cloudinary fetch URL", () => {
    expect(
      cloudinaryImageUrl({
        ...image,
        cloudName: "demo",
        origin: "https://example.org",
        width: 256,
      }),
    ).toBe(
      `https://res.cloudinary.com/demo/image/fetch/f_auto,q_auto,c_limit,w_256/https://example.org/img/${image.id}/${image.hash}.webp`,
    );
  });
});

describe("socialImageUrl", () => {
  it("crops to 1200x630 through Cloudinary when configured", () => {
    expect(socialImageUrl(image, "demo")).toMatch(
      /^https:\/\/res\.cloudinary\.com\/demo\/image\/fetch\/f_jpg,q_auto,c_fill,w_1200,h_630\/https?:\/\/.+\/img\//,
    );
  });

  it("falls back to our absolute URL", () => {
    expect(socialImageUrl(image, undefined)).toMatch(/^https?:\/\/.+\/img\//);
  });
});

describe("sniffImageType", () => {
  it("recognises the three allowed formats by magic bytes", () => {
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffImageType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBP"))).toBe(
      "image/webp",
    );
    expect(
      sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WAVE")),
    ).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<svg"))).toBeNull();
  });
});
