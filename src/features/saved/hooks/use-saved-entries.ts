import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { MAX_SAVED_ENTRIES } from "@/constants/saved";
import { viewerQueryOptions } from "@/features/session/session-queries";
import { m } from "@/paraglide/messages";

import { savedEntriesQuery } from "../saved-queries";
import type { ISavedEntry } from "../saved-schemas";
import { useReplaceSavedEntries } from "./use-replace-saved-entries";

// The member's saved entries, and a toggle that sends a guest to sign in.
export function useSavedEntries() {
  const navigate = useNavigate();
  const location = useLocation();
  const viewer = useQuery(viewerQueryOptions()).data;
  const query = useQuery({ ...savedEntriesQuery(), enabled: Boolean(viewer) });
  const save = useReplaceSavedEntries();
  const entries = viewer ? (query.data ?? []) : [];

  function isSaved(slug: string) {
    return entries.some((item) => item.slug === slug);
  }

  function toggle(target: ISavedEntry) {
    if (!viewer) {
      void navigate({ to: "/login", search: { redirect: location.href } });
      return;
    }
    // Every save replaces the whole list, so one built before the list arrived would erase it.
    if (!query.isSuccess) {
      toast.error(m.map_saved_failed());
      return;
    }
    if (isSaved(target.slug)) {
      save.mutate(entries.filter((item) => item.slug !== target.slug));
      return;
    }
    if (entries.length >= MAX_SAVED_ENTRIES) {
      toast.error(m.map_saved_limit({ max: MAX_SAVED_ENTRIES }));
      return;
    }
    save.mutate([...entries, target]);
  }

  return { entries, isSaved, toggle };
}
