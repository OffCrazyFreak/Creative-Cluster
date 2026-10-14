import type {
  OpportunityCategory,
  OpportunityRuleCode,
  OpportunityType,
} from "@/constants/opportunities";
import { m } from "@/paraglide/messages";

import type { OwnOpportunityState } from "./opportunity-types";

const TYPE: Record<OpportunityType, () => string> = {
  seeking: () => m.opportunities_type_seeking(),
  offering: () => m.opportunities_type_offering(),
};

const CATEGORY: Record<OpportunityCategory, () => string> = {
  partner: () => m.opportunities_category_partner(),
  skill: () => m.opportunities_category_skill(),
  space: () => m.opportunities_category_space(),
  service: () => m.opportunities_category_service(),
  funding_call_partner: () => m.opportunities_category_funding_call_partner(),
  other: () => m.opportunities_category_other(),
};

const STATE: Record<OwnOpportunityState, () => string> = {
  pending: () => m.opportunities_state_pending(),
  active: () => m.opportunities_state_active(),
  expiring_soon: () => m.opportunities_state_expiring_soon(),
  expired: () => m.opportunities_state_expired(),
  filled: () => m.opportunities_state_filled(),
  rejected: () => m.opportunities_state_rejected(),
  removed: () => m.opportunities_state_removed(),
};

const REFUSED: Record<OpportunityRuleCode, () => string> = {
  entry_not_published: () => m.opportunities_refused_entry_not_published(),
  limit_active: () => m.opportunities_refused_limit_active(),
  limit_daily: () => m.opportunities_refused_limit_daily(),
  duplicate: () => m.opportunities_refused_duplicate(),
  bad_deadline: () => m.opportunities_refused_bad_deadline(),
  invalid_tags: () => m.opportunities_refused_invalid_tags(),
  not_renewable: () => m.opportunities_refused_not_renewable(),
  not_editable: () => m.opportunities_refused_not_editable(),
};

const REASON: Record<string, () => string> = {
  incomplete: () => m.opportunities_reason_incomplete(),
  duplicate: () => m.opportunities_reason_duplicate(),
  out_of_scope: () => m.opportunities_reason_out_of_scope(),
  unverifiable: () => m.opportunities_reason_unverifiable(),
  spam: () => m.opportunities_reason_spam(),
  other: () => m.opportunities_reason_other(),
};

export function typeLabel(type: OpportunityType) {
  return TYPE[type]();
}

export function categoryLabel(category: OpportunityCategory) {
  return CATEGORY[category]();
}

export function stateLabel(state: OwnOpportunityState) {
  return STATE[state]();
}

export function refusedLabel(code: OpportunityRuleCode) {
  return REFUSED[code]();
}

export function reasonLabel(code: string) {
  return (REASON[code] ?? REASON.other)();
}
