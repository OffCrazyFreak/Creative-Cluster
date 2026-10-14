import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@/paraglide/messages";

import { CONNECTIONS_QUERY_KEY } from "../connections-queries";

// One click, one toast, then every connections list refetches. A rejected call (session expired,
// link already decided) shows the generic failure instead of escaping the click handler.
export function useConnectionAction() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, doneText: string) {
    setBusy(true);
    try {
      await action();
      toast.success(doneText);
      return true;
    } catch {
      toast.error(m.connections_failed());
      return false;
    } finally {
      // Also after a failure: the link may already have been decided or withdrawn elsewhere.
      await queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
      setBusy(false);
    }
  }
  return { run, busy };
}
