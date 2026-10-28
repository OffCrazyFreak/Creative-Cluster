import { usePrefersReducedMotion } from "./use-media-query";

// Material 3's emphasized decelerate in, emphasized accelerate out.
const OPEN = "400ms cubic-bezier(0.05, 0.7, 0.1, 1)";
const CLOSE = "200ms cubic-bezier(0.3, 0, 0.8, 0.15)";

export function morphTiming(open: boolean, reducedMotion: boolean) {
  if (reducedMotion) return "none";
  const timing = open ? OPEN : CLOSE;
  return `clip-path ${timing}, opacity ${timing}`;
}

// The CSS transition for the phone search bar growing open or shrinking shut.
export function useMorphTransition(open: boolean) {
  return morphTiming(open, usePrefersReducedMotion());
}
