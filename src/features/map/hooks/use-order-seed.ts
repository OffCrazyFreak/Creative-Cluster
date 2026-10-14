import { useSyncExternalStore } from "react";

const STORAGE_KEY = "cc-order-seed";
// Server and the hydrating client share this seed so markup matches; the visit's own seed follows.
const SERVER_SEED = 1;

function subscribe() {
  return () => undefined;
}

let fallbackSeed: number | null = null;

function readSeed(): number {
  try {
    let stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = String(Math.floor(Math.random() * 2 ** 31) + 2);
      sessionStorage.setItem(STORAGE_KEY, stored);
    }
    return Number(stored);
  } catch {
    // Storage can be blocked; the order then lasts for the page load.
    fallbackSeed ??= Math.floor(Math.random() * 2 ** 31) + 2;
    return fallbackSeed;
  }
}

// One shuffled order per browser session, so the list does not rearrange on every navigation.
export function useOrderSeed(): number {
  return useSyncExternalStore(subscribe, readSeed, () => SERVER_SEED);
}
