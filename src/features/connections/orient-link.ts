import { SYMMETRIC_LINK_KINDS, type LinkKind } from "@/constants/links";

import type { LinkDirection } from "./connections-schemas";

export interface IOrientedLink {
  fromId: string;
  toId: string;
  symmetric: boolean;
}

// Symmetric kinds are stored once with the smaller id first (CHECK link_symmetric_order_check);
// directed kinds keep the proposer's chosen direction.
export function orientLink(
  kind: LinkKind,
  proposerId: string,
  targetId: string,
  direction: LinkDirection,
): IOrientedLink {
  if (SYMMETRIC_LINK_KINDS.includes(kind)) {
    const [fromId, toId] =
      proposerId < targetId ? [proposerId, targetId] : [targetId, proposerId];
    return { fromId, toId, symmetric: true };
  }
  return direction === "outgoing"
    ? { fromId: proposerId, toId: targetId, symmetric: false }
    : { fromId: targetId, toId: proposerId, symmetric: false };
}
