import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { REVIEW_TYPES } from "@/constants/moderation";
import { REVIEW_AGE_FILTERS } from "@/constants/review";
import ReviewQueuePage from "@/features/review/components/review-queue-page";
import { reviewQueueQueryOptions } from "@/features/review/review-queries";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";

const searchSchema = z.object({
  type: z.enum(REVIEW_TYPES).optional().catch(undefined),
  age: z.enum(REVIEW_AGE_FILTERS).default("all").catch("all"),
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional()
    .catch(undefined),
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/admin/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      context.queryClient.ensureQueryData(reviewQueueQueryOptions(deps)),
    ),
  component: AdminHome,
});

function AdminHome() {
  return <ReviewQueuePage search={Route.useSearch()} />;
}
