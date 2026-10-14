import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createMyOpportunity,
  fillMyOpportunity,
  renewMyOpportunity,
  updateMyOpportunity,
} from "../opportunity.functions";
import { opportunityKeys } from "../opportunity-queries";
import type { OpportunityFormValues } from "../opportunity-schemas";

// Every action changes the owner's list, so each one refreshes it when it settles.
export function useOpportunityActions() {
  const queryClient = useQueryClient();
  function onSettled() {
    return queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
  }

  const create = useMutation({
    mutationFn: (values: OpportunityFormValues) =>
      createMyOpportunity({
        data: { values },
      }),
    onSettled,
  });
  const update = useMutation({
    mutationFn: (input: { id: string; values: OpportunityFormValues }) =>
      updateMyOpportunity({ data: input }),
    onSettled,
  });
  const renew = useMutation({
    mutationFn: (input: { id: string; deadline?: string }) =>
      renewMyOpportunity({ data: input }),
    onSettled,
  });
  const fill = useMutation({
    mutationFn: (id: string) => fillMyOpportunity({ data: { id } }),
    onSettled,
  });
  return { create, update, renew, fill };
}
