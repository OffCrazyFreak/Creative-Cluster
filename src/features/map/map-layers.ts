import type {
  CircleLayerSpecification,
  ExpressionSpecification,
} from "maplibre-gl";

import { SOURCE_ID } from "./map-geojson";

// Placeholder colours for the map layers only; the brand theme replaces them with the style fork.
const COLORS = {
  cluster: "#4f46e5",
  point: "#4f46e5",
  selected: "#db2777",
  outline: "#ffffff",
  badge: "#f59e0b",
} as const;

export const CLUSTER_LAYER_ID = "clusters";
export const POINT_LAYER_ID = "points";

const active: ExpressionSpecification = [
  "boolean",
  ["feature-state", "active"],
  false,
];
// to-number with a fallback: a cached payload from before this field existed must not break the paint.
const hasOpportunities: ExpressionSpecification = [
  ">",
  ["to-number", ["get", "opps"], 0],
  0,
];
const selected: ExpressionSpecification = [
  "boolean",
  ["feature-state", "selected"],
  false,
];

// Circle layers only (no DOM markers): clusters grow with their count, points grow on hover or selection.
export const clusterLayer: Omit<CircleLayerSpecification, "source"> = {
  id: CLUSTER_LAYER_ID,
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": COLORS.cluster,
    "circle-opacity": 0.85,
    "circle-radius": [
      "step",
      ["get", "point_count"],
      14,
      5,
      18,
      15,
      23,
      40,
      30,
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": COLORS.outline,
  },
};

export const pointLayer: Omit<CircleLayerSpecification, "source"> = {
  id: POINT_LAYER_ID,
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["case", selected, COLORS.selected, COLORS.point],
    "circle-radius": ["case", ["any", active, selected], 11, 7],
    // A thicker amber ring marks entries that have live opportunities.
    "circle-stroke-width": ["case", hasOpportunities, 4, 2],
    "circle-stroke-color": [
      "case",
      hasOpportunities,
      COLORS.badge,
      COLORS.outline,
    ],
  },
};

export const CLUSTER_RADIUS = 50;
export const CLUSTER_MAX_ZOOM = 14;
export { SOURCE_ID };
