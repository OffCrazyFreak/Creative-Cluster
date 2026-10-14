import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  getApplyFormTokenFn,
  getRejectedApplication,
} from "@/features/apply/apply.functions";
import { toFormValues } from "@/features/apply/apply-defaults";
import ApplyPage from "@/features/apply/components/apply-page";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  resubmit: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/apply/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ resubmit: search.resubmit }),
  loader: async ({ deps }) => ({
    initial: deps.resubmit
      ? await getRejectedApplication({ data: { token: deps.resubmit } })
      : undefined,
    formToken: await getApplyFormTokenFn(),
  }),
  head: ({ match }) =>
    pageHead({
      path: "/apply",
      title: m.apply_title(),
      description: m.apply_meta_description(),
      // An edit link is private to the applicant.
      noindex: Boolean(match.search.resubmit),
    }),
  component: ApplyRoute,
});

function ApplyRoute() {
  const { resubmit } = Route.useSearch();
  const { initial, formToken } = Route.useLoaderData();
  return (
    <ApplyPage
      resubmitToken={resubmit}
      formToken={formToken}
      initial={initial ? toFormValues(initial) : initial}
    />
  );
}
