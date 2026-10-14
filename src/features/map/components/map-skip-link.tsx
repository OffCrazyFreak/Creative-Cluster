import { m } from "@/paraglide/messages";

// First stop inside the frame, so keyboard users can jump past the map controls to the results.
export default function MapSkipLink() {
  return (
    <a
      href="#results-panel"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
    >
      {m.map_skip_map()}
    </a>
  );
}
