import {
  useCanGoBack,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useState, type ReactNode, type RefObject } from "react";

import MobileMenu from "@/components/custom/layout/mobile-menu";

import type { MapStatus } from "../map-frame-context";
import MapAccountButton from "./map-account-button";
import MapFilterChips from "./map-filter-chips";
import MapPhoneSearch from "./map-phone-search";
import MapSearchBar from "./map-search-bar";
import MapStatusNotice from "./map-status-notice";

interface IMapPhoneLayoutProps {
  status: MapStatus;
  frameRef: RefObject<HTMLDivElement | null>;
  barRef: RefObject<HTMLDivElement | null>;
  map: ReactNode;
  children: ReactNode;
}

// The phone map: full screen under a floating bar whose search opens into the list; other
// pages of the frame (an entry, the board) show in that open surface, with back to the map.
export default function MapPhoneLayout({
  status,
  frameRef,
  barRef,
  map,
  children,
}: IMapPhoneLayoutProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const onIndex = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId === "/_map/",
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const open = searchOpen || !onIndex;

  // Picking an entry leaves the list; back then returns to the map, not to the list.
  const [wasOnIndex, setWasOnIndex] = useState(onIndex);
  if (onIndex !== wasOnIndex) {
    setWasOnIndex(onIndex);
    if (!onIndex) setSearchOpen(false);
  }

  function close() {
    setSearchOpen(false);
    if (onIndex) return;
    if (canGoBack) router.history.back();
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
      <div className="absolute inset-0" inert={open}>
        {map}
      </div>
    </>
  );
}
