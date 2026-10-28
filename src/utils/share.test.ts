import { afterEach, describe, expect, it, vi } from "vitest";

import { shareOrCopy } from "./share";

const DATA = { title: "Studio", url: "https://example.org/e/studio" };

function stubNavigator(share?: () => Promise<void>, copyFails = false) {
  const writeText = vi.fn(() =>
    copyFails ? Promise.reject(new Error("blocked")) : Promise.resolve(),
  );
  vi.stubGlobal("navigator", { share, clipboard: { writeText } });
  return writeText;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shareOrCopy", () => {
  it("uses the share sheet when there is one", async () => {
    const writeText = stubNavigator(() => Promise.resolve());
    expect(await shareOrCopy(DATA)).toBe("shared");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("treats closing the sheet as a choice, not a reason to copy", async () => {
    const writeText = stubNavigator(() =>
      Promise.reject(new DOMException("closed", "AbortError")),
    );
    expect(await shareOrCopy(DATA)).toBe("dismissed");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link without a share sheet or when sharing fails", async () => {
    const writeText = stubNavigator();
    expect(await shareOrCopy(DATA)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(DATA.url);

    stubNavigator(() => Promise.reject(new TypeError("not allowed")));
    expect(await shareOrCopy(DATA)).toBe("copied");
  });

  it("reports a failure when the clipboard is blocked too", async () => {
    stubNavigator(undefined, true);
    expect(await shareOrCopy(DATA)).toBe("failed");
  });
});
