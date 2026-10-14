import { createHash } from "node:crypto";

import { env } from "@/env.server";

import type { ITown } from "./town-types";

const KM_PER_DEGREE = 111.32;
// Assumed density for turning a population into a town radius.
const PEOPLE_PER_KM2 = 1500;

export function townRadiusKm(population: number): number {
  return Math.sqrt(Math.max(population, 1) / (Math.PI * PEOPLE_PER_KM2));
}

export function offsetRadiusKm(population: number): number {
  return Math.min(4, Math.max(1, 0.4 * townRadiusKm(population)));
}

// People are shown near their town, never at a real address. The same entry id and secret always give
// the same spot (so the pin never jumps), and the secret keeps the spot from being worked backwards.
export function offsetPin(
  entryId: string,
  town: Pick<ITown, "lat" | "lng" | "population">,
  secret: string,
): { lat: number; lng: number } {
  const digest = createHash("sha256")
    .update(entryId + secret)
    .digest();
  const angle = (digest.readUInt32BE(0) / 2 ** 32) * 2 * Math.PI;
  // Square root gives a uniform spread over the disc instead of a cluster in the middle.
  const distance =
    Math.sqrt(digest.readUInt32BE(4) / 2 ** 32) *
    offsetRadiusKm(town.population);
  return {
    lat: town.lat + (Math.sin(angle) * distance) / KM_PER_DEGREE,
    lng:
      town.lng +
      (Math.cos(angle) * distance) /
        (KM_PER_DEGREE * Math.cos((town.lat * Math.PI) / 180)),
  };
}

export function pseudonymPin(entryId: string, town: ITown) {
  return offsetPin(entryId, town, env.PSEUDONYM_SECRET);
}
