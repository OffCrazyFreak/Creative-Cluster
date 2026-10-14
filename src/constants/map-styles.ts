export const MAP_STYLES = {
  // Hosted by OpenFreeMap; the brand fork from Maputnik replaces this URL later.
  openfreemap: "https://tiles.openfreemap.org/styles/positron",
  // Kept as a one-line switch in the site config if OpenFreeMap has an outage.
  carto: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

export type MapStyleId = keyof typeof MAP_STYLES;
