// MapLibre paint and canvas drawing cannot read CSS variables; these placeholders are replaced by the brand theme's style fork.
export const MAP_COLORS = {
  selected: "#db2777",
  outline: "#ffffff",
  badge: "#f59e0b",
  savedStar: "#f59e0b",
  savedStarRim: "#d97706",
  // A dark rim keeps 3:1 contrast against any basemap colour (WCAG 1.4.11).
  tileRim: "#1f2937",
  tileFill: "#ffffff",
  tileText: "#1f2937",
} as const;
