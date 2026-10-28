import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode, type RefObject } from "react";

import MobileMenu from "@/components/custom/layout/mobile-menu";
import { getLocale } from "@/paraglide/runtime";

import { distanceLabel } from "../distance-label";
import { useMapFrame, type MapStatus } from "../map-frame-context";
import { backReturnsToMap } from "../map-phone-back";
import MapAccountButton from "./map-account-button";
import MapEntrySheet from "./map-entry-sheet";
import MapFilterChips from "./map-filter-chips";
import MapPhoneSearch from "./map-phone-search";
import MapSearchBar from "./map-search-bar";
import MapStatusNotice from "./map-status-notice";

interface IMapPhoneLayoutProps {
  status: MapStatus;
  frameRef: RefObject<HTMLDivElement | null>;
  barRef: RefObject<HTMLDivElement | null>;
  sheetRef: RefObject<HTMLDivElement | null>;
  locateRef: RefObject<HTMLButtonElement | null>;
  onCoveredChange: (covered: boolean) => void;
  selectedSlug: string | null;
  onSelectedChange: (slug: string | null) => void;
  onSheetHeightChange: (height: number) => void;
  children: ReactNode;
}

// The phone map: full screen under a floating bar whose search opens into the list; other
// pages of the frame (an entry, the board) show in that open surface, with back to the map.
export default function MapPhoneLayout({
  status,
  frameRef,
  barRef,
  sheetRef,
  locateRef,
  onCoveredChange,
  selectedSlug,
  onSelectedChange,
  onSheetHeightChange,
  children,
}: IMapPhoneLayoutProps) {
  const { directory, origin } = useMapFrame();
  const router = useRouter();
  const navigate = useNavigate();
  const onIndex = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId === "/_map/",
  });
  // The resolved location, not the pending one, so the index always belongs to the shown route.
  const historyIndex = useRouterState({
    select: (state) => state.resolvedLocation?.state.__TSR_index ?? null,
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const open = searchOpen || !onIndex;
  useEffect(() => onCoveredChange(open), [open, onCoveredChange]);
  const entry =
    directory?.entries.find((item) => item.slug === selectedSlug) ?? null;

  // Picking an entry leaves the list; back then returns to the map with that entry's sheet.
  const [wasOnIndex, setWasOnIndex] = useState(onIndex);
  const [mapHistoryIndex, setMapHistoryIndex] = useState<number | null>(null);
  if (onIndex && historyIndex !== mapHistoryIndex)
    setMapHistoryIndex(historyIndex);
  if (onIndex !== wasOnIndex) {
    setWasOnIndex(onIndex);
    if (!onIndex) setSearchOpen(false);
  }

  function close() {
    setSearchOpen(false);
    if (onIndex) return;
    if (backReturnsToMap(mapHistoryIndex, historyIndex)) router.history.back();
    else void navigate({ to: "/" });
  }

  return (
    <>
      <MapPhoneSearch
        open={open}
        onOpen={() => setSearchOpen(true)}
        onClose={close}
        containerRef={frameRef}
        barRef={barRef}
        menu={<MobileMenu />}
        account={<MapAccountButton />}
        renderField={(inputRef) => <MapSearchBar inputRef={inputRef} />}
      >
        <div className="flex flex-col gap-4">
          <MapFilterChips />
          <MapStatusNotice status={status} />
          <div id="results-panel">{children}</div>
        </div>
      </MapPhoneSearch>
      <MapEntrySheet
        entry={open ? null : entry}
        tags={directory?.tags ?? []}
        distance={entry ? distanceLabel(entry, origin, getLocale()) : null}
        onClose={() => onSelectedChange(null)}
        onHeightChange={onSheetHeightChange}
        sheetRef={sheetRef}
        returnFocusRef={locateRef}
      />
    </>
  );
}
