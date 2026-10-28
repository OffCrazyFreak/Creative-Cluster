// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IPoint } from "../map-search";
import { useGeolocation } from "./use-geolocation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const SPLIT = { lat: 43.51, lng: 16.44 };
const CODES = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;
const calls: { success: Success; failure: Failure }[] = [];

// The browser API is a boundary the suite cannot run: each test answers the calls itself.
function stubGeolocation() {
  calls.length = 0;
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (success: Success, failure: Failure) =>
        calls.push({ success, failure }),
    },
  });
}

function fix(lat: number, accuracy: number) {
  return {
    coords: { latitude: lat, longitude: 16.44, accuracy },
  } as GeolocationPosition;
}

function error(code: number) {
  return { ...CODES, code, message: "" } as GeolocationPositionError;
}

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// A minimal renderHook: the repository has no Testing Library.
function setup(fallback: IPoint | null) {
  const result = {
    current: null as unknown as ReturnType<typeof useGeolocation>,
  };
  function Probe() {
    result.current = useGeolocation(fallback, false);
    return null;
  }
  root = createRoot(document.createElement("div"));
  act(() => root?.render(<Probe />));
  act(() => result.current.locate());
  return result;
}

describe("useGeolocation", () => {
  it("falls back to the IP guess when the device gives no position", () => {
    stubGeolocation();
    const result = setup(SPLIT);
    act(() => calls[0].failure(error(CODES.TIMEOUT)));

    expect(result.current.status).toBe("approximate");
    expect(result.current.guess).toEqual(SPLIT);
    expect(result.current.centerRequest).toMatchObject({ ...SPLIT, zoom: 11 });
  });

  it("does not guess for someone who refused location", () => {
    stubGeolocation();
    const result = setup(SPLIT);
    act(() => calls[0].failure(error(CODES.PERMISSION_DENIED)));

    expect(result.current.status).toBe("denied");
    expect(result.current.guess).toBeNull();
  });

  it("gives up after 15 s and takes the guess back on a late refusal", () => {
    vi.useFakeTimers();
    stubGeolocation();
    const result = setup(SPLIT);
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.status).toBe("approximate");

    act(() => calls[0].failure(error(CODES.PERMISSION_DENIED)));

    expect(result.current.status).toBe("denied");
    expect(result.current.centerRequest).toBeNull();
  });

  it("sharpens a vague fix once and ignores callbacks of an older tap", () => {
    stubGeolocation();
    const result = setup(null);
    act(() => calls[0].success(fix(43.5, 900)));
    expect(calls).toHaveLength(2);

    act(() => result.current.locate());
    act(() => calls[1].success(fix(43.6, 20)));

    expect(result.current.position).toMatchObject({ lat: 43.5 });
    act(() => calls[2].success(fix(43.7, 50)));
    expect(result.current.position).toMatchObject({ lat: 43.7 });
  });
});
