import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

import ErrorPage from "@/components/custom/errors/error-page";
import NotFoundPage from "@/components/custom/errors/not-found-page";
import AppShell from "@/components/custom/layout/app-shell";
import RootDocument from "@/components/custom/layout/root-document";
import { viewerQueryOptions } from "@/features/session/session-queries";
import { site } from "@/sites";

import appCss from "../styles.css?url";

interface IRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<IRouterContext>()({
  beforeLoad: async ({ context }) => ({
    viewer: await context.queryClient.ensureQueryData(viewerQueryOptions()),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: site.name },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootDocument,
  component: AppShell,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});
