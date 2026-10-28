import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { isUnauthorized } from "@/features/account/is-unauthorized";

import { VIEWER_QUERY_KEY } from "./session-queries";

interface ILoaderContext {
  context: { queryClient: QueryClient };
  location: { href: string };
}

// The cached viewer can outlive its session; the guard then says so and the visitor goes to log in.
// Clearing the viewer matters: otherwise "Try again" reruns the loader with the same stale viewer.
export async function loginOnUnauthorized<T>(
  { context, location }: ILoaderContext,
  load: () => Promise<T>,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    context.queryClient.setQueryData(VIEWER_QUERY_KEY, null);
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
}
