import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

// The phone's selected entry lives in `?entry=`: selecting pushes, so Back closes the sheet,
// and closing replaces, so the history does not fill up (as Disscount's `?store=`).
export function useEntrySelection() {
  const { entry } = useSearch({ from: "/_map" });
  const navigate = useNavigate();

  const select = useCallback(
    (slug: string | null) => {
      if ((slug ?? "") === entry) return;
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, entry: slug ?? "" }),
        replace: slug === null,
      });
    },
    [entry, navigate],
  );

  return { selectedSlug: entry || null, select };
}
