import { describe, expect, it } from "vitest";

import { measurePadding } from "./map-padding";

function rect(x: number, y: number, width: number, height: number) {
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
  } as DOMRect;
}

describe("measurePadding", () => {
  const frame = rect(0, 0, 1200, 800);

  it("leaves room for the side panel on wide screens", () => {
    expect(measurePadding(frame, rect(12, 12, 384, 776), null, true)).toEqual({
      top: 16,
      right: 16,
      bottom: 16,
      left: 412,
    });
  });

  it("clamps a panel that covers most of the map", () => {
    expect(measurePadding(frame, rect(0, 0, 1100, 800), null, true).left).toBe(
      540,
    );
  });

  it("uses the search block and the sheet height on phones", () => {
    const phone = rect(0, 0, 390, 700);
    const padding = measurePadding(
      phone,
      rect(8, 8, 374, 96),
      rect(0, 604, 390, 96),
      false,
    );
    expect(padding.top).toBe(120);
    expect(padding.bottom).toBe(112);
    expect(padding.left).toBe(16);
  });
});
