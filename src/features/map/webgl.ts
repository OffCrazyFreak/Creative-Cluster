// MapLibre 6 needs WebGL 2; checking first lets the page fall back before the 400 KB chunk is fetched.
export function supportsWebgl2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}
