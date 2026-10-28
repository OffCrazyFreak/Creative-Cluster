import { useEffect, useRef, useState } from "react";

import type { IPoint } from "../map-search";

export type GeolocationStatus =
  | "idle"
  | "locating"
  | "located"
  | "approximate"
  | "denied"
  | "unavailable"
  | "timeout";

export interface IGpsPosition extends IPoint {
  // Metres, the 95% confidence radius the browser reports.
  accuracy: number;
}

// A fix the map should move to; refinements of the same fix do not move it.
export interface ICenterRequest extends IPoint {
  id: number;
  // Started by the page rather than a tap, so it yields to a user who moved the map.
  auto: boolean;
  // Set for a guess that knows the town, not the street.
  zoom?: number;
}

// The spec does not count time on the permission prompt against `timeout`, so an ignored
// prompt would spin forever without our own timer.
const GIVE_UP_MS = 15_000;
const GUESS_ZOOM = 11;
// A fast Wi-Fi or cell fix comes first; GPS is only worth waiting for when it is vaguer than a street.
const REFINE_ABOVE_M = 100;

function toFix({ coords }: GeolocationPosition): IGpsPosition {
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy,
  };
}

// The position never leaves the device. When a tap gets no position at all, the IP guess
// (`fallback`) stands in, labelled approximate; a refusal never guesses.
export function useGeolocation(fallback: IPoint | null, autoLocate: boolean) {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [position, setPosition] = useState<IGpsPosition | null>(null);
  const [guess, setGuess] = useState<IPoint | null>(null);
  const [centerRequest, setCenterRequest] = useState<ICenterRequest | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Late callbacks from an older request must not overwrite a newer one.
  const requests = useRef(0);
  // The give-up timer and a late browser error can both fail one tap.
  const guessedFor = useRef(0);

  function settle(next: GeolocationStatus) {
    clearTimeout(timer.current);
    setStatus(next);
  }

  // Chrome on Android with location off never answers and ends in a timeout.
  function fail(next: GeolocationStatus, id: number) {
    if (!fallback || next === "denied") return settle(next);
    if (guessedFor.current === id) return;
    guessedFor.current = id;
    setPosition(null);
    setGuess(fallback);
    setCenterRequest({ ...fallback, id, auto: false, zoom: GUESS_ZOOM });
    settle("approximate");
  }

  function refine(first: IGpsPosition, id: number) {
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const fix = toFix(result);
        if (requests.current === id && fix.accuracy < first.accuracy)
          setPosition(fix);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: GIVE_UP_MS, maximumAge: 0 },
    );
  }

  function locate(auto = false) {
    if (!("geolocation" in navigator)) return setStatus("unavailable");
    const id = ++requests.current;
    clearTimeout(timer.current);
    setStatus("locating");
    if (!auto)
      timer.current = setTimeout(() => fail("timeout", id), GIVE_UP_MS);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (requests.current !== id) return;
        const fix = toFix(result);
        setPosition(fix);
        setGuess(null);
        setCenterRequest({ lat: fix.lat, lng: fix.lng, id, auto });
        settle("located");
        if (fix.accuracy > REFINE_ABOVE_M) refine(fix, id);
      },
      (error) => {
        if (requests.current !== id) return;
        // An automatic attempt fails quietly; the button is still there.
        if (auto) return settle("idle");
        if (error.code === error.PERMISSION_DENIED) {
          // A refusal after the give-up timer guessed takes the guess back.
          setGuess(null);
          setCenterRequest(null);
          return settle("denied");
        }
        fail(error.code === error.TIMEOUT ? "timeout" : "unavailable", id);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  // Locating without a tap is fine only when no prompt can appear. Safari may report "prompt"
  // for a granted permission; that just means waiting for a tap.
  useEffect(() => {
    if (!autoLocate) return;
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (!cancelled && permission.state === "granted") locate(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, position, guess, centerRequest, locate: () => locate() };
}
