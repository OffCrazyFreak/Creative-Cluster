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

// How much of the map the floating panels hide (desktop: left side panel, phones: search block on
// top and the sheet below, whose top edge is passed in).
export function measureCovered(
  frame: DOMRect,
  panel: DOMRect | null,
  sheetTop: number | null,
  wide: boolean,
): IMapPadding {
  return {
    top: !wide && panel ? Math.max(0, panel.bottom - frame.top) : 0,
    right: 0,
    bottom:
      !wide && sheetTop !== null ? Math.max(0, frame.bottom - sheetTop) : 0,
    left: wide && panel ? Math.max(0, panel.right - frame.left) : 0,
  };
}

export function measurePadding(
  frame: DOMRect,
  panel: DOMRect | null,
  sheet: DOMRect | null,
  wide: boolean,
): IMapPadding {
  const covered = measureCovered(frame, panel, sheet?.top ?? null, wide);
  return {
    top: clamp(covered.top + MARGIN, frame.height),
    right: MARGIN,
    bottom: clamp(covered.bottom + MARGIN, frame.height),
    left: clamp(covered.left + MARGIN, frame.width),
  };
}
