import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect } from "react";

import type { IMapPadding } from "../map-padding";
import { readVisibleArea, type IViewArea } from "../view-area";

interface IUseViewReportInput {
  getMap: () => MapLibreMap | undefined;
  ready: boolean;
  getCovered: () => IMapPadding;
  // Changes when the panels move, which changes how much of the map is in sight.
  coverKey: string;
  onViewChange: (area: IViewArea | null) => void;
}

// Tells the list which part of the map is actually in sight.
export function useViewReport({
  getMap,
  ready,
  getCovered,
  coverKey,
  onViewChange,
}: IUseViewReportInput) {
  const reportView = useCallback(() => {
    const map = getMap();
    if (map) onViewChange(readVisibleArea(map, getCovered()));
  }, [getMap, getCovered, onViewChange]);

  useEffect(() => {
    if (ready) reportView();
  }, [ready, coverKey, reportView]);

  return reportView;
}
