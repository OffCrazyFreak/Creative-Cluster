import { useEffect } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";

const STALL_CHECK_MS = 1500;

interface IUseMapRecoveryInput {
  getMap: () => MaplibreMap | undefined;
  ready: boolean;
  styleUrl: string;
  remount: () => void;
}

// Two known MapLibre problems: a lost WebGL context can leave the style blank (setStyle again on restore,
// issue 8690), and iOS can stall tiles after the tab was hidden (remount if they never load, issue 8461).
export function useMapRecovery({
  getMap,
  ready,
  styleUrl,
  remount,
}: IUseMapRecoveryInput) {
  useEffect(() => {
    const found = getMap();
    if (!ready || !found) return;
    const map = found;
    const canvas = map.getCanvas();
    function onRestored() {
      map.setStyle(styleUrl);
    }
    canvas.addEventListener("webglcontextrestored", onRestored);

    let timer: number | undefined;
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const current = getMap();
        if (current && !current.loaded()) remount();
      }, STALL_CHECK_MS);
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(timer);
    };
  }, [getMap, ready, styleUrl, remount]);
}
