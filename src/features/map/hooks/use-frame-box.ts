import { useEffect, useState, type RefObject } from "react";

export interface IFrameBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Where the floating bar sits inside the map, as insets from each edge, kept current on resize.
export function useFrameBox(
  bar: RefObject<HTMLElement | null>,
  container: RefObject<HTMLElement | null>,
): IFrameBox | null {
  const [box, setBox] = useState<IFrameBox | null>(null);

  useEffect(() => {
    const barNode = bar.current;
    const containerNode = container.current;
    if (!barNode || !containerNode) return;
    const observer = new ResizeObserver(() => {
      const inner = barNode.getBoundingClientRect();
      const outer = containerNode.getBoundingClientRect();
      setBox({
        top: inner.top - outer.top,
        right: outer.right - inner.right,
        bottom: inner.bottom - outer.top,
        left: inner.left - outer.left,
      });
    });
    observer.observe(barNode);
    observer.observe(containerNode);
    return () => observer.disconnect();
  }, [bar, container]);

  return box;
}
