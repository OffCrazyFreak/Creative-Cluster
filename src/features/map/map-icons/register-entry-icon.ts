import type { Map as MaplibreMap } from "maplibre-gl";

import { ownImageUrl } from "@/lib/images/image-url";

import {
  ICON_PIXEL_RATIO,
  renderInitialsTile,
  renderLogoTile,
  renderSelectedFrame,
} from "./entry-icon";
import {
  parseEntryIconId,
  SELECTED_FRAME_ID,
  SELECTED_STACK_FRAME_ID,
} from "./entry-icon-id";

const FRAMES: Record<string, boolean> = {
  [SELECTED_FRAME_ID]: false,
  [SELECTED_STACK_FRAME_ID]: true,
};

// The initials tile goes in at once so no tile waits on the network; the logo replaces it when it
// loads. A logo that fails or taints the canvas leaves the initials. Our own /img route is same
// origin, so the logo never needs CORS from a CDN.
export async function registerEntryIcon(map: MaplibreMap, id: string) {
  const icon = parseEntryIconId(id);
  // Initials drawn before the page font loads would keep the fallback font for the session.
  if (icon) await document.fonts.ready;
  if (map.hasImage(id)) return;
  const options = { pixelRatio: ICON_PIXEL_RATIO };
  if (id in FRAMES) {
    map.addImage(id, renderSelectedFrame(FRAMES[id]), options);
    return;
  }
  if (!icon) return;
  map.addImage(id, renderInitialsTile(icon.initials), options);
  if (!icon.logo) return;
  renderLogoTile(ownImageUrl(icon.logo))
    .then((logo) => {
      if (!map.hasImage(id)) return;
      map.updateImage(id, logo);
      // updateImage only marks the image dirty; an idle map would keep the initials until it moved.
      map.triggerRepaint();
    })
    .catch(() => {
      // The map may be gone by now, or the logo unusable: the initials tile stays.
    });
}

// Tiles are drawn the first time a pin needs them rather than all up front. Since MapLibre 6 the
// styleimagemissing event fires only after the tile was built without the image; the resolver is
// awaited before the tile is built, and a rejection there only leaves that image out.
export function watchEntryIcons(map: MaplibreMap): () => void {
  map.setMissingStyleImageResolver((id) => registerEntryIcon(map, id));
  return () => {
    map.setMissingStyleImageResolver(null);
  };
}
