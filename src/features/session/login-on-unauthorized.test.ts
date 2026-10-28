import { QueryClient } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

import { Route as AccountConnections } from "@/routes/account.connections";
import { Route as AccountData } from "@/routes/account.data";
import { Route as AccountIndex } from "@/routes/account.index";
import { Route as AccountListing } from "@/routes/account.listing";
import { Route as AccountOpportunities } from "@/routes/account.opportunities";
import { Route as AdminChanges } from "@/routes/admin.changes";
import { Route as AdminEntries } from "@/routes/admin.entries";
import { Route as AdminEntry } from "@/routes/admin.entry.$id";
import { Route as AdminIndex } from "@/routes/admin.index";
import { Route as AdminLinks } from "@/routes/admin.links";
import { Route as AdminUsers } from "@/routes/admin.users";
import { Route as Help } from "@/routes/help";

import { VIEWER_QUERY_KEY } from "./session-queries";

// Server functions reject with a plain Error once the guard's UnauthorizedError crosses the wire.
function unauthorized() {
  return Promise.reject(new Error("Unauthorized"));
}

vi.mock("@/features/legal/load-content", () => ({
  loadLegalContent: () => Promise.resolve(""),
  loadAdminHelp: unauthorized,
}));

const ROUTES = {
  AccountConnections,
  AccountData,
  AccountIndex,
  AccountListing,
  AccountOpportunities,
  AdminChanges,
  AdminEntries,
  AdminEntry,
  AdminIndex,
  AdminLinks,
  AdminUsers,
  Help,
};

async function runLoader(route: { options: { loader?: unknown } }) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(VIEWER_QUERY_KEY, { role: "admin" });
  queryClient.ensureQueryData = unauthorized;
  const loader = route.options.loader as (args: unknown) => unknown;
  const thrown = await Promise.resolve()
    .then(() =>
      loader({
        context: { queryClient, viewer: { role: "admin" } },
        location: { href: "/x" },
        params: { id: "0190a0a0-0000-7000-8000-000000000000" },
        deps: { page: 1 },
      }),
    )
    .then(
      () => null,
      (error: unknown) => error,
    );
  return { thrown, viewer: queryClient.getQueryData(VIEWER_QUERY_KEY) };
}

describe("signed-in loaders on an expired session", () => {
  for (const [name, route] of Object.entries(ROUTES)) {
    it(`${name} clears the viewer and sends the visitor to log in`, async () => {
      const { thrown, viewer } = await runLoader(route);
      expect(isRedirect(thrown)).toBe(true);
      expect(viewer).toBeNull();
    });
  }
});
