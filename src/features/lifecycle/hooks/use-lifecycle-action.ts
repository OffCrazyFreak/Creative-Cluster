import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { m } from "@/paraglide/messages";

type ActionResult = { ok: boolean };

// Runs one lifecycle action, reports the outcome in a toast and refreshes the listed queries.
export function useLifecycleAction(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return async function run(
    action: () => Promise<ActionResult>,
    doneText: string = m.lifecycle_done(),
    failText: string = m.lifecycle_failed(),
  ): Promise<boolean> {
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(failText);
        // The screen may show actions that no longer apply, so reload it either way.
        await queryClient.invalidateQueries({ queryKey });
        return false;
      }
      toast.success(doneText);
      await queryClient.invalidateQueries({ queryKey });
      return true;
    } catch {
      toast.error(m.lifecycle_error());
      return false;
    }
  };
}
