import { useEffect, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";

import {
  findSelectedFrame,
  sameFrame,
  type ISelectedFrame,
} from "../selected-frame";

interface IUseSelectedFrameInput {
  map: MaplibreMap | undefined;
  // True once the entry layers exist, so they can be queried.
  ready: boolean;
  slug: string | null;
  point: { lng: number; lat: number } | null;
}

// Keeps the selection frame on whatever the selected entry is drawn as.
export function useSelectedFrame({
  map,
  ready,
  slug,
  point,
}: IUseSelectedFrameInput) {
  // Tagged with its entry, so a frame left from an earlier pick never shows.
  const [located, setLocated] = useState<{
    slug: string;
    frame: ISelectedFrame | null;
  } | null>(null);
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (!ready || !map || !slug || lat === undefined || lng === undefined)
      return;
    const instance = map;
    const key = slug;
    const target = { lat, lng };
    let cancelled = false;
    let latestRun = 0;

    // "idle" fires once tiles and clusters for the new view are drawn, which a plain moveend can
    // beat. An unchanged frame keeps its object, so the overlay does not redraw and fire idle again.
    async function locate() {
      const run = ++latestRun;
      let next: ISelectedFrame | null;
      try {
        next = await findSelectedFrame(instance, key, target);
      } catch {
        // A filter change can retire a cluster mid-lookup; the next idle looks again.
        return;
      }
      // Lookups can finish out of order; only the newest view counts.
      if (cancelled || run !== latestRun) return;
      setLocated((current) =>
        current?.slug === key && sameFrame(current.frame, next)
          ? current
          : { slug: key, frame: next },
      );
    }

    function onIdle() {
      void locate();
    }

    onIdle();
    instance.on("idle", onIdle);
    return () => {
      cancelled = true;
      instance.off("idle", onIdle);
    };
  }, [map, ready, slug, lat, lng]);

  return located && located.slug === slug ? located.frame : null;
}
