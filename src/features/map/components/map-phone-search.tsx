import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { useFrameBox } from "../hooks/use-frame-box";
import { useMorphTransition } from "../hooks/use-morph-transition";
import MapSearchLead from "./map-search-lead";
import MapSearchSurface from "./map-search-surface";

interface IMapPhoneSearchProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  barRef: RefObject<HTMLDivElement | null>;
  menu: ReactNode;
  account: ReactNode;
  renderField: (inputRef: RefObject<HTMLInputElement | null>) => ReactNode;
  // The filters and the list, shown once the bar has opened.
  children: ReactNode;
}

// The phone map's floating bar, growing into the full-screen search when the field is pressed.
export default function MapPhoneSearch({
  open,
  onOpen,
  onClose,
  containerRef,
  barRef,
  menu,
  account,
  renderField,
  children,
}: IMapPhoneSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const transition = useMorphTransition(open);
  const frame = useFrameBox(barRef, containerRef);
  // Set when a keyboard closes the search, so focus returns to the field; on a touch screen
  // that would raise the keyboard again, so it blurs instead.
  const keepFocus = useRef(false);

  useEffect(() => {
    if (open) return;
    if (keepFocus.current) inputRef.current?.focus({ preventScroll: true });
    else inputRef.current?.blur();
    keepFocus.current = false;
  }, [open]);

  function close(byKeyboard: boolean) {
    keepFocus.current = byKeyboard;
    onClose();
  }

  function opensSearch(target: EventTarget) {
    return !(target instanceof Element && target.closest("button"));
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        // A search input's own Escape would clear the query along with closing.
        event.preventDefault();
        close(true);
      }}
    >
      <MapSearchSurface open={open} frame={frame} transition={transition} />
      <div
        ref={barRef}
        data-map-bar=""
        className="group pointer-events-auto absolute inset-x-2 top-2 flex items-center gap-2 rounded-xl border bg-background p-1"
        data-open={open || undefined}
      >
        <MapSearchLead open={open} onBack={close} menu={menu} />
        {/* The same field throughout: iOS raises the keyboard only for an input focused
            within the tap. Its own buttons (filters) leave the map as it is. */}
        <div
          className="min-w-0 flex-1"
          onPointerDown={(event) => {
            if (opensSearch(event.target)) onOpen();
          }}
          onFocus={(event) => {
            // Focus handed back on close, or moving within the field, stays put.
            if (keepFocus.current) return;
            if (event.currentTarget.contains(event.relatedTarget)) return;
            if (opensSearch(event.target)) onOpen();
          }}
        >
          {renderField(inputRef)}
        </div>
        <div
          inert={open}
          className="flex max-w-12 shrink-0 justify-end overflow-hidden transition-[max-width,opacity] group-data-open:max-w-0 group-data-open:opacity-0 motion-reduce:transition-none"
        >
          {account}
        </div>
      </div>
      {open ? (
        <div
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex animate-in flex-col overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] delay-150 duration-400 fade-in-0 fill-mode-both slide-in-from-bottom-4 motion-reduce:animate-none"
          style={{ top: frame?.bottom ?? 56 }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
