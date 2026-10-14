import { SYMMETRIC_LINK_KINDS, type LinkKind } from "@/constants/links";
import { m } from "@/paraglide/messages";

import type { LinkDirection } from "./connections-schemas";
import { kindLabel } from "./connection-kind-label";

const RELATIONS = {
  member_of: {
    outgoing: m.connections_rel_member_of_outgoing,
    incoming: m.connections_rel_member_of_incoming,
  },
  supplier: {
    outgoing: m.connections_rel_supplier_outgoing,
    incoming: m.connections_rel_supplier_incoming,
  },
  mentor: {
    outgoing: m.connections_rel_mentor_outgoing,
    incoming: m.connections_rel_mentor_incoming,
  },
} as const;

const ROLES = {
  member_of: {
    outgoing: m.connections_role_member_of_outgoing,
    incoming: m.connections_role_member_of_incoming,
  },
  supplier: {
    outgoing: m.connections_role_supplier_outgoing,
    incoming: m.connections_role_supplier_incoming,
  },
  mentor: {
    outgoing: m.connections_role_mentor_outgoing,
    incoming: m.connections_role_mentor_incoming,
  },
} as const;

type DirectedKind = keyof typeof RELATIONS;

export function isDirectedKind(kind: LinkKind): kind is DirectedKind {
  return !SYMMETRIC_LINK_KINDS.includes(kind);
}

// "Member of" or "Has as a member": how the other listing relates to the one being described.
export function relationLabel(kind: LinkKind, direction: LinkDirection) {
  return isDirectedKind(kind) ? RELATIONS[kind][direction]() : kindLabel(kind);
}

// Wording for the form, from the proposer's own point of view.
export function roleLabel(kind: DirectedKind, direction: LinkDirection) {
  return ROLES[kind][direction]();
}
