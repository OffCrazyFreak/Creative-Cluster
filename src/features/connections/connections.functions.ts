import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminGuard, memberGuard } from "@/server/guards";

import {
  decideLinkInput,
  linkIdInput,
  proposeLinkInput,
  searchTargetsInput,
} from "./connections-schemas";
import { decideLink, withdrawLink } from "./decide-link.server";
import {
  countPendingProposals,
  listMyConnections,
  listUnclaimedWaiting,
} from "./list-links.server";
import { proposeLink } from "./propose-link.server";
import { searchLinkTargets } from "./search-targets.server";

export const getMyConnections = createServerFn({ method: "GET" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(({ context }) => listMyConnections(context.user.id));

export const getPendingProposalCount = createServerFn({ method: "GET" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(({ context }) => countPendingProposals(context.user.id));

export const searchConnectionTargets = createServerFn({ method: "GET" })
  .middleware([memberGuard])
  .inputValidator(searchTargetsInput)
  .handler(({ data, context }) =>
    searchLinkTargets(data.query, context.user.id),
  );

export const proposeConnection = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(proposeLinkInput)
  .handler(({ data, context }) => proposeLink(data, context.user.id));

export const decideConnection = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(decideLinkInput)
  .handler(({ data, context }) =>
    decideLink(data, { userId: context.user.id, admin: false }),
  );

export const withdrawConnection = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(linkIdInput)
  .handler(({ data, context }) => withdrawLink(data.linkId, context.user.id));

export const getUnclaimedProposals = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.void())
  .handler(({ context }) => listUnclaimedWaiting(context.user.id));

export const decideUnclaimedProposal = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(decideLinkInput)
  .handler(({ data, context }) =>
    decideLink(data, { userId: context.user.id, admin: true }),
  );
