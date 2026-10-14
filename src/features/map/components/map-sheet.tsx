import { cn } from "cn";
import { useEffect, useState, type ReactNode, type Ref } from "react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { m } from "@/paraglide/messages";

interface IMapSheetProps {
  sheetRef: Ref<HTMLDivElement>;
  // How much of the screen's bottom the sheet covers, as a CSS length.
  onCoveredChange: (covered: string) => void;
  children: ReactNode;
}

const PEEK = "96px";
const HALF = 0.5;
const FULL = 0.92;

// Phone results sheet: never closes, three snap points, and the list scrolls only when fully open.
export default function MapSheet({
  sheetRef,
  onCoveredChange,
  children,
}: IMapSheetProps) {
  const [snap, setSnap] = useState<number | string | null>(HALF);

  useEffect(() => {
    onCoveredChange(typeof snap === "number" ? `${snap * 100}dvh` : PEEK);
  }, [snap, onCoveredChange]);

  return (
    <Drawer
      open
      modal={false}
      showSwipeHandle
      snapPoints={[PEEK, HALF, FULL]}
      snapPoint={snap}
      onSnapPointChange={setSnap}
      onOpenChange={() => undefined}
    >
      <DrawerContent ref={sheetRef} aria-label={m.map_sheet_label()}>
        <DrawerTitle className="sr-only">{m.map_sheet_label()}</DrawerTitle>
        <div
          id="results-panel"
          className={cn(
            "min-h-0 flex-1 overscroll-contain p-4 pb-[env(safe-area-inset-bottom)]",
            snap === FULL ? "overflow-y-auto" : "overflow-hidden",
          )}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
