import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getApplicationVerification } from "@/features/apply/apply.functions";
import ApplyVerifyPage from "@/features/apply/components/apply-verify-page";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

const searchSchema = z.object({
  token: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/apply/verify")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) =>
    deps.token
      ? getApplicationVerification({ data: { token: deps.token } })
      : null,
  head: () => ({
    meta: [
      { title: `${m.apply_verify_title()} | ${site.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VerifyRoute,
});

function VerifyRoute() {
  const { token } = Route.useSearch();
  return <ApplyVerifyPage token={token} preview={Route.useLoaderData()} />;
}
