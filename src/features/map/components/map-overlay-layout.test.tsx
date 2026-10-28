// @vitest-environment jsdom
import { act, createRef, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MapOverlayLayout from "./map-overlay-layout";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("./map-search-bar", () => ({ default: () => null }));
vi.mock("./map-filter-chips", () => ({ default: () => null }));
vi.mock("./map-skip-link", () => ({ default: () => null }));
vi.mock("./map-status-notice", () => ({ default: () => null }));
vi.mock("./map-phone-layout", () => ({
  default: () => <div data-testid="phone-layout" />,
}));

const mounts = vi.fn();

function MapProbe() {
  useEffect(() => {
    mounts();
  }, []);
  return <div data-testid="map" />;
}

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  mounts.mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function render(wide: boolean) {
  root.render(
    <MapOverlayLayout
      wide={wide}
      status="active"
      frameRef={createRef()}
      panelRef={createRef()}
      locateRef={createRef()}
      map={<MapProbe />}
      sheetCovered={0}
      onSheetCoveredChange={() => {}}
      selectedSlug={null}
      onSelectedChange={() => {}}
    >
      <p>list</p>
    </MapOverlayLayout>,
  );
}

async function settle(wide: boolean) {
  await act(async () => {
    render(wide);
    await Promise.resolve();
  });
}

describe("MapOverlayLayout", () => {
  // First: once the lazy phone layout has loaded, it never suspends again in this file.
  it("keeps the bar's place while the phone layout loads", async () => {
    act(() => render(false));
    expect(host.querySelector("[data-map-bar]")).not.toBeNull();

    await act(async () => {});
    expect(host.querySelector('[data-testid="phone-layout"]')).not.toBeNull();
  });

  it("keeps one map instance across the phone breakpoint", async () => {
    await settle(true);
    await settle(false);
    await settle(true);

    expect(mounts).toHaveBeenCalledTimes(1);
  });
});
