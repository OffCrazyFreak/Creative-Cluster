import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

// Selecting pushes to `?entry=` so Back closes the sheet, and closing replaces so the history does not fill up.
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
