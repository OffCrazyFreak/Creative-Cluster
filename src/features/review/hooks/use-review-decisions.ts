import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { m } from "@/paraglide/messages";

import { REVIEW_QUEUE_KEY } from "../review-queries";
import type { DecideReviewInput, IDecideResult } from "../review-schemas";
import { decideReviewItemsFn } from "../review.functions";

function countOf(results: IDecideResult[], outcome: IDecideResult["outcome"]) {
  return results.filter((result) => result.outcome === outcome).length;
}

// One summary toast per run; the queue refetches so decided items disappear.
export function useReviewDecisions() {
  const queryClient = useQueryClient();
  return async function decide(input: DecideReviewInput): Promise<boolean> {
    try {
      const results = await decideReviewItemsFn({ data: input });
      const done = countOf(results, "ok");
      const gone = countOf(results, "gone");
      const unsupported = countOf(results, "unsupported");
      const failed = countOf(results, "failed");
      const expired = countOf(results, "expired");
      const noAccount = countOf(results, "no_account");
      if (done + noAccount)
        toast.success(m.review_done({ count: done + noAccount }));
      if (noAccount) toast.info(m.review_no_account({ count: noAccount }));
      if (expired) toast.error(m.review_expired({ count: expired }));
      if (gone) toast.info(m.review_gone({ count: gone }));
      if (unsupported) toast.info(m.review_unsupported({ count: unsupported }));
      if (failed) toast.error(m.review_failed({ count: failed }));
      await queryClient.invalidateQueries({ queryKey: REVIEW_QUEUE_KEY });
      return failed === 0;
    } catch {
      toast.error(m.review_error());
      return false;
    }
  };
}
