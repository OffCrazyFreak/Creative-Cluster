import { useEffect, type RefObject } from "react";

// The map frame fills the screen below the header, whose height changes when the nav wraps.
export function useHeaderHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    let last = 0;
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize[0].blockSize;
      if (height === last) return;
      last = height;
      root.style.setProperty("--site-header-height", `${height}px`);
    });
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--site-header-height");
    };
  }, [ref]);
}
