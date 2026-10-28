// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import MapSameSpotPopover from "./map-same-spot-popover";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const canvas = document.createElement("canvas");
canvas.tabIndex = 0;
const listeners = new Map<string, () => void>();
const fakeMap = {
  getCanvas: () => canvas,
  on: (type: string, listener: () => void) => listeners.set(type, listener),
  off: (type: string) => listeners.delete(type),
};

vi.mock("@vis.gl/react-maplibre", () => ({
  useMap: () => ({ current: { getMap: () => fakeMap } }),
  Marker: ({ children }: { children: ReactNode }) => children,
}));

const PINS = [
  { slug: "a", name: "Atelier", city: "Zagreb", logo: null },
  { slug: "b", name: "Bureau", city: "Zagreb", logo: null },
  { slug: "c", name: "Studio", city: "Split", logo: null },
] as unknown as IDirectoryEntry[];
const SPOT = { lng: 15.9, lat: 45.8, slugs: ["a", "b"] };

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host, canvas);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
  listeners.clear();
});

function render(
  pins: IDirectoryEntry[],
  onSelect = vi.fn(),
  onClose = vi.fn(),
) {
  act(() =>
    root.render(
      <MapSameSpotPopover
        spot={SPOT}
        pins={pins}
        onSelect={onSelect}
        onClose={onClose}
      />,
    ),
  );
  return { onSelect, onClose };
}

function rowNames() {
  return [...document.querySelectorAll("li button")].map(
    (button) => button.textContent,
  );
}

describe("MapSameSpotPopover", () => {
  it("lists only the entries at the spot, named for screen readers", () => {
    render(PINS);
    expect(rowNames()).toEqual(["AAtelierZagreb", "BBureauZagreb"]);
    expect(
      document.querySelector('[role="dialog"]')?.getAttribute("aria-label"),
    ).toBe("2 entries at this spot");
  });

  it("selects the picked entry and keeps focus on the map", () => {
    const { onSelect } = render(PINS);
    act(() => (document.querySelector("li button") as HTMLElement).click());
    expect(onSelect).toHaveBeenCalledWith("a");
    expect(document.activeElement).toBe(canvas);
  });

  it("closes when the map starts moving", () => {
    const { onClose } = render(PINS);
    listeners.get("movestart")?.();
    expect(onClose).toHaveBeenCalled();
  });

  it("hands focus back to the map on Escape", () => {
    const { onClose } = render(PINS);
    const popup = document.querySelector('[role="dialog"]') as HTMLElement;
    act(() => {
      popup.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onClose).toHaveBeenCalled();
    expect(document.activeElement).toBe(canvas);
  });

  it("closes for good when the filters hide every entry there", () => {
    const { onClose } = render(PINS.slice(2));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
