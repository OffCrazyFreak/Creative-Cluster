export interface IMapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const MARGIN = 16;
// Panels may cover at most this share of the map, so the pins always have room.
const MAX_SHARE = 0.45;

function clamp(value: number, size: number) {
  return Math.max(MARGIN, Math.min(value, size * MAX_SHARE));
}

// Measured from the live panel (desktop: left side panel, phones: search block on top and the sheet below).
export function measurePadding(
  frame: DOMRect,
  panel: DOMRect | null,
  sheet: DOMRect | null,
  wide: boolean,
): IMapPadding {
  const left = wide && panel ? panel.right - frame.left + MARGIN : MARGIN;
  const top = !wide && panel ? panel.bottom - frame.top + MARGIN : MARGIN;
  const bottom = !wide && sheet ? frame.bottom - sheet.top + MARGIN : MARGIN;
  return {
    top: clamp(top, frame.height),
    right: MARGIN,
    bottom: clamp(bottom, frame.height),
    left: clamp(left, frame.width),
  };
}
