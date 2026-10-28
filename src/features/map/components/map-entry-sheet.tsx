import { Link } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import type {
  IDirectoryEntry,
  IDirectoryTag,
} from "@/features/directory/directory-schemas";
import { m } from "@/paraglide/messages";

import MapResultItem from "./map-result-item";

interface IMapEntrySheetProps {
  entry: IDirectoryEntry | null;
  tags: IDirectoryTag[];
  distance: string | null;
  onClose: () => void;
  // The sheet's height in pixels, 0 once it closes.
  onHeightChange: (height: number) => void;
  // A map control, not the search field, whose focus would raise the phone keyboard.
  returnFocusRef: RefObject<HTMLElement | null>;
}

// The phone's selected entry: swiping it away or the X deselects it.
export default function MapEntrySheet({
  entry,
  tags,
  distance,
  onClose,
  onHeightChange,
  returnFocusRef,
}: IMapEntrySheetProps) {
  // Kept through the closing slide, which still shows the last entry.
  const [shown, setShown] = useState(entry);
  if (entry && entry !== shown) setShown(entry);
  const [shownDistance, setShownDistance] = useState(distance);
  if (entry && distance !== shownDistance) setShownDistance(distance);
  // State, not a ref: measuring starts once the portalled popup actually exists.
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!popup) return;
    const observer = new ResizeObserver(() =>
      onHeightChange(popup.offsetHeight),
    );
    observer.observe(popup);
    return () => {
      observer.disconnect();
      onHeightChange(0);
    };
  }, [popup, onHeightChange]);

  return (
    <Drawer
      open={entry !== null}
      onOpenChange={(open) => !open && onClose()}
      // The map stays in use behind it: panning or tapping another pin must not close it.
      modal={false}
      disablePointerDismissal
      showSwipeHandle
    >
      <DrawerContent
        ref={setPopup}
        finalFocus={returnFocusRef}
        aria-label={m.map_entry_sheet_label()}
        className="md:hidden"
      >
        {shown ? (
          <div className="flex flex-col gap-3 p-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerTitle className="sr-only">{shown.name}</DrawerTitle>
            <div className="flex items-start gap-2">
              <ul className="min-w-0 flex-1">
                <MapResultItem
                  entry={shown}
                  tags={tags}
                  distance={shownDistance}
                />
              </ul>
              <DrawerClose
                render={<Button variant="ghost" size="icon" />}
                aria-label={m.common_close()}
                className="shrink-0"
              >
                <XIcon aria-hidden="true" />
              </DrawerClose>
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/e/$slug" params={{ slug: shown.slug }} />}
            >
              {m.map_entry_full_page()}
            </Button>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
