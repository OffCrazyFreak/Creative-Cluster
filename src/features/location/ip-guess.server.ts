import { getContext } from "@netlify/functions";

import { site } from "@/sites";

export interface IIpGuess {
  lat: number;
  lng: number;
}

// About a kilometre: enough to centre and sort, no finer than the guess is.
function round(value: number) {
  return Math.round(value * 100) / 100;
}

// Nothing is stored or logged, and only a guess inside the site's region is used, so others keep the default order.
export function readIpGuess(): IIpGuess | null {
  let geo;
  try {
    geo = getContext().geo;
  } catch {
    // Outside a Netlify request (local dev, tests) there is no context.
    return null;
  }
  const lat = geo?.latitude;
  const lng = geo?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const [[west, south], [east, north]] = site.map.ipBounds;
  if (lat < south || lat > north || lng < west || lng > east) return null;
  return { lat: round(lat), lng: round(lng) };
}
