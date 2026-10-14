import { GeocodeError } from "./errors";
import type { Geocoder } from "./types";

export const BREAKER_MS = 10 * 60 * 1000;
const RATE_LIMIT_PAUSE_MS = 60 * 1000;
const OUTAGE_PAUSE_MS = 30 * 1000;

export interface IBreaker {
  isOpen(): boolean;
  trip(ms?: number): void;
}

export function createBreaker(
  now: () => number = Date.now,
  openMs = BREAKER_MS,
): IBreaker {
  let openUntil = 0;
  return {
    isOpen: () => now() < openUntil,
    trip: (ms = openMs) => {
      openUntil = now() + ms;
    },
  };
}

// A 403 means we were banned or the key is dead: stop calling that provider for ten minutes.
// Rate limits and outages get a short pause, so a struggling provider is not hit on every keystroke.
export async function guarded<T>(
  breaker: IBreaker,
  call: () => Promise<T>,
): Promise<T> {
  if (breaker.isOpen()) throw new GeocodeError("unavailable", "circuit open");
  try {
    return await call();
  } catch (error) {
    if (error instanceof GeocodeError) {
      if (error.code === "auth") breaker.trip();
      if (error.code === "rate_limited") breaker.trip(RATE_LIMIT_PAUSE_MS);
      if (error.code === "unavailable") breaker.trip(OUTAGE_PAUSE_MS);
    }
    throw error;
  }
}

export function withBreaker(geocoder: Geocoder, breaker: IBreaker): Geocoder {
  return {
    ...geocoder,
    suggest:
      geocoder.suggest && ((q) => guarded(breaker, () => geocoder.suggest!(q))),
    search: (q) => guarded(breaker, () => geocoder.search(q)),
    reverse: (q) => guarded(breaker, () => geocoder.reverse(q)),
  };
}
