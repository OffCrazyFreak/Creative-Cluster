import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { startClientMonitoring } from "@/lib/monitoring/start-client-monitoring";
import { getRequestNonce } from "@/lib/csp/request-nonce";
import "@/lib/zod/zod-locale";
import { deLocalizeUrl, localizeUrl } from "@/paraglide/runtime";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    ssr: { nonce: import.meta.env.SSR ? getRequestNonce() : undefined },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });
  if (!router.isServer) startClientMonitoring(router);

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
