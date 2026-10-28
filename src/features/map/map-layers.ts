import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  ExpressionSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

import { MAP_COLORS as COLORS } from "./map-colors";
import { SOURCE_ID } from "./map-geojson";
import { SELECTED_FRAME_ID } from "./map-icons/entry-icon-id";

export const CLUSTER_LAYER_ID = "clusters";
export const POINT_LAYER_ID = "points";
const HOVER_LAYER_ID = "point-hover";
const OPPORTUNITY_LAYER_ID = "point-opportunities";

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
const isPoint: ExpressionSpecification = ["!", ["has", "point_count"]];

// Pins never hide each other: an entry that silently vanished in a dense town would read as
// missing data. Clustering keeps the overlap in check instead.
const ALWAYS_VISIBLE = {
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
} as const;

// No DOM markers: clusters are circles that grow with their count, points are logo or initials tiles.
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

export const pointLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: POINT_LAYER_ID,
  type: "symbol",
  filter: isPoint,
  layout: { "icon-image": ["get", "icon"], ...ALWAYS_VISIBLE },
};

// The selection frame around the open entry, and faintly while its list row is hovered or focused.
export const hoverLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: HOVER_LAYER_ID,
  type: "symbol",
  filter: isPoint,
  layout: { "icon-image": SELECTED_FRAME_ID, ...ALWAYS_VISIBLE },
  paint: { "icon-opacity": ["case", selected, 1, active, 0.6, 0] },
};

// An amber dot on the tile's corner marks entries that have live opportunities.
export const opportunityLayer: Omit<CircleLayerSpecification, "source"> = {
  id: OPPORTUNITY_LAYER_ID,
  type: "circle",
  filter: ["all", isPoint, hasOpportunities],
  paint: {
    "circle-color": COLORS.badge,
    "circle-radius": 5,
    "circle-translate": [16, -16],
    "circle-stroke-width": 2,
    "circle-stroke-color": COLORS.outline,
  },
};

export const ARC_LAYER_ID = "connection-arcs";

// One line layer for every arc of the selected entry; it sits under the pins.
export const arcLayer: Omit<LineLayerSpecification, "source"> = {
  id: ARC_LAYER_ID,
  type: "line",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": COLORS.selected,
    "line-width": 2,
    "line-opacity": 0.7,
  },
};

export const CLUSTER_RADIUS = 50;
export const CLUSTER_MAX_ZOOM = 14;
export { SOURCE_ID };
