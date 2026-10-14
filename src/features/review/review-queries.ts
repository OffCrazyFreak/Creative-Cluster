import { queryOptions } from "@tanstack/react-query";

import { listReviewItemsFn } from "./review.functions";
import type { ReviewListInput } from "./review-schemas";

export const REVIEW_QUEUE_KEY = ["admin", "review"] as const;

export function reviewQueueQueryOptions(input: ReviewListInput) {
  return queryOptions({
    queryKey: [...REVIEW_QUEUE_KEY, input],
    queryFn: () => listReviewItemsFn({ data: input }),
  });
}
