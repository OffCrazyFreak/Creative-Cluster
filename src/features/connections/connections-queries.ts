import { queryOptions } from "@tanstack/react-query";

import type { AdminLinksSearch } from "./admin-links-schemas";
import {
  getAdminProposedLinks,
  getConnectionPartnerSlugs,
  getMyConnections,
  getPublicConnections,
  getPendingProposalCount,
  getUnclaimedProposals,
  searchConnectionTargets,
} from "./connections.functions";

export const CONNECTIONS_QUERY_KEY = ["connections"] as const;

export function myConnectionsQuery() {
  return queryOptions({
    queryKey: [...CONNECTIONS_QUERY_KEY, "mine"],
    queryFn: () => getMyConnections(),
  });
}

export function pendingCountQuery() {
  return queryOptions({
    queryKey: [...CONNECTIONS_QUERY_KEY, "pending-count"],
    queryFn: () => getPendingProposalCount(),
  });
}

export function unclaimedProposalsQuery() {
  return queryOptions({
    queryKey: [...CONNECTIONS_QUERY_KEY, "unclaimed"],
    queryFn: () => getUnclaimedProposals(),
  });
}

export function adminProposedLinksQuery(input: AdminLinksSearch) {
  return queryOptions({
    queryKey: [...CONNECTIONS_QUERY_KEY, "admin-proposed", input],
    queryFn: () => getAdminProposedLinks({ data: input }),
  });
}

export function targetSearchQuery(query: string) {
  return queryOptions({
    queryKey: [...CONNECTIONS_QUERY_KEY, "search", query],
    queryFn: ({ signal }) =>
      searchConnectionTargets({ data: { query }, signal }),
    staleTime: 30_000,
  });
}

export function publicConnectionsQuery(entryId: string) {
  return queryOptions({
    queryKey: [...CONNECTIONS_QUERY_KEY, "public", entryId],
    queryFn: () => getPublicConnections({ data: { entryId } }),
    staleTime: 60_000,
  });
}

export function partnerSlugsQuery(slug: string) {
  return queryOptions({
    queryKey: [...CONNECTIONS_QUERY_KEY, "slugs", slug],
    queryFn: () => getConnectionPartnerSlugs({ data: { slug } }),
    staleTime: 60_000,
  });
}
