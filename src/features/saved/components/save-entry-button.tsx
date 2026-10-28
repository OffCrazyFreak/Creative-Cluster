import { Star } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { MAP_COLORS } from "@/features/map/map-colors";
import { m } from "@/paraglide/messages";

import { useSavedEntries } from "../hooks/use-saved-entries";
import type { ISavedEntry } from "../saved-schemas";

interface ISaveEntryButtonProps {
  entry: ISavedEntry;
}

// Saving (or a failed save rolling back) moves the row to another group, which mounts a new star
// and drops focus to the page. The new star takes it back until focus lands anywhere else.
let pendingFocus: string | null = null;
let watchingFocus = false;

function watchFocus() {
  if (watchingFocus) return;
  watchingFocus = true;
  document.addEventListener("focusin", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.dataset?.saveSlug !== pendingFocus) pendingFocus = null;
  });
}

export default function SaveEntryButton({ entry }: ISaveEntryButtonProps) {
  const { isSaved, toggle } = useSavedEntries();
  const isOn = isSaved(entry.slug);
  const label = isOn
    ? m.map_unsave({ name: entry.name })
    : m.map_save({ name: entry.name });
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pendingFocus !== entry.slug) return;
    const active = document.activeElement;
    if (!active || active === document.body) ref.current?.focus();
  }, [isOn, entry.slug]);

  function onClick() {
    watchFocus();
    pendingFocus = entry.slug;
    toggle(entry);
  }

  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="icon-xs"
      data-save-slug={entry.slug}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative ml-1.5 rounded-full align-middle after:absolute after:-inset-2 motion-reduce:transition-none"
    >
      <Star
        aria-hidden="true"
        fill={isOn ? MAP_COLORS.savedStar : "none"}
        color={isOn ? MAP_COLORS.savedStarRim : "currentColor"}
      />
    </Button>
  );
}
