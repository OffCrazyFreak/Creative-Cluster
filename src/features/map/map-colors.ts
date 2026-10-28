// MapLibre paint and canvas drawing cannot read CSS variables, so the map's few colours live here.
// They are placeholders the brand theme replaces with the style fork.
export const MAP_COLORS = {
  selected: "#db2777",
  outline: "#ffffff",
  badge: "#f59e0b",
  // A dark rim keeps 3:1 contrast against any basemap colour (WCAG 1.4.11).
  tileRim: "#1f2937",
  tileFill: "#ffffff",
  tileText: "#1f2937",
} as const;
