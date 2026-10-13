import { GeocodeError } from "./errors";
import type { Geocoder } from "./types";

export const BREAKER_MS = 10 * 60 * 1000;

export interface IBreaker {
  isOpen(): boolean;
  trip(): void;
}

export function createBreaker(
  now: () => number = Date.now,
  openMs = BREAKER_MS,
): IBreaker {
  let openUntil = 0;
  return {
    isOpen: () => now() < openUntil,
    trip: () => {
      openUntil = now() + openMs;
    },
  };
}

// A 403 means we were banned or the key is dead: stop calling that provider for ten minutes.
export async function guarded<T>(
  breaker: IBreaker,
  call: () => Promise<T>,
): Promise<T> {
  if (breaker.isOpen()) throw new GeocodeError("unavailable", "circuit open");
  try {
    return await call();
  } catch (error) {
    if (error instanceof GeocodeError && error.code === "auth") breaker.trip();
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
