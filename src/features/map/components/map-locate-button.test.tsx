// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GeolocationStatus } from "../hooks/use-geolocation";
import MapLocateButton from "./map-locate-button";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

function render(status: GeolocationStatus) {
  act(() =>
    root.render(<MapLocateButton status={status} onLocate={() => undefined} />),
  );
}

describe("MapLocateButton", () => {
  it("explains every failed tap, even when the status stays the same", () => {
    // A browser without geolocation answers each tap with "unavailable" again.
    render("unavailable");
    const button = host.querySelector("button");

    act(() => button?.click());
    act(() => button?.click());

    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it("says nothing about a failure this button did not ask for", () => {
    render("denied");

    expect(toast.error).not.toHaveBeenCalled();
  });
});
