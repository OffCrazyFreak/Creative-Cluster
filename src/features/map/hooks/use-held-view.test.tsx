// @vitest-environment jsdom
import { act, type FocusEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { IViewArea } from "../view-area";
import { useHeldView } from "./use-held-view";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function box(
  west: number,
  south: number,
  east: number,
  north: number,
): IViewArea {
  return {
    corners: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  };
}

const ZAGREB = box(15.9, 45.7, 16.1, 45.9);
const SPLIT = box(16.3, 43.4, 16.6, 43.6);

let root: Root | null = null;
afterEach(() => act(() => root?.unmount()));

// A minimal renderHook: the repository has no Testing Library.
function setup() {
  const result = { current: null as unknown as ReturnType<typeof useHeldView> };
  function Probe({ live }: { live: IViewArea | null }) {
    result.current = useHeldView(live);
    return null;
  }
  root = createRoot(document.createElement("div"));
  function rerender(live: IViewArea | null) {
    act(() => root?.render(<Probe live={live} />));
  }
  rerender(ZAGREB);
  return { result, rerender };
}

describe("useHeldView", () => {
  it("follows the map while nobody is in the list", () => {
    const { result, rerender } = setup();
    rerender(SPLIT);
    expect(result.current.applied).toEqual(SPLIT);
    expect(result.current.pending).toBe(false);
  });

  it("waits while the pointer is in the list, then applies on leaving", () => {
    const { result, rerender } = setup();
    act(() => result.current.holdProps.onPointerEnter());
    rerender(SPLIT);
    expect(result.current.applied).toEqual(ZAGREB);
    expect(result.current.pending).toBe(true);

    act(() => result.current.holdProps.onPointerLeave());
    expect(result.current.applied).toEqual(SPLIT);
    expect(result.current.pending).toBe(false);
  });

  it("applies a held view when asked", () => {
    const { result, rerender } = setup();
    act(() => result.current.holdProps.onPointerEnter());
    rerender(SPLIT);
    act(() => result.current.apply());
    expect(result.current.applied).toEqual(SPLIT);
    expect(result.current.pending).toBe(false);
  });

  it("stops holding after the update chip, whose removal fires no blur", () => {
    const { result, rerender } = setup();
    const keyboardFocus = {
      target: { matches: () => true },
    } as unknown as FocusEvent<HTMLElement>;
    act(() => result.current.holdProps.onFocus(keyboardFocus));
    rerender(SPLIT);
    act(() => result.current.apply());
    rerender(ZAGREB);
    expect(result.current.applied).toEqual(ZAGREB);
    expect(result.current.pending).toBe(false);
  });
});
