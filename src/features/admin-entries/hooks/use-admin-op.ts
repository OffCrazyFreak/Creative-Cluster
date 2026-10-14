import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { m } from "@/paraglide/messages";

import { ADMIN_KEY } from "../admin-entries-queries";
import type { OpResult } from "../admin-entries-schemas";

// Runs one admin operation: toasts the outcome, reloads every admin query, and tells the dialog whether to close.
export function useAdminOp() {
  const queryClient = useQueryClient();
  return async function run<E extends string>(
    action: () => Promise<OpResult<E>>,
    doneText: string,
    errorText: (error: E) => string,
  ): Promise<boolean> {
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(errorText(result.error));
        return false;
      }
      toast.success(doneText);
      await queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
      return true;
    } catch {
      toast.error(m.lifecycle_error());
      return false;
    }
  };
}
