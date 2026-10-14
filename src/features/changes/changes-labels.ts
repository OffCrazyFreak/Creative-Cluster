import { m } from "@/paraglide/messages";

import type { IChangeRow } from "./changes-schemas";

const ENTITY: Record<IChangeRow["entityType"], () => string> = {
  entry: () => m.review_changes_entity_entry(),
  opportunity: () => m.review_changes_entity_opportunity(),
  link: () => m.review_changes_entity_link(),
  tag: () => m.review_changes_entity_tag(),
  user: () => m.review_changes_entity_user(),
};
const SOURCE: Record<IChangeRow["source"], () => string> = {
  owner: () => m.review_changes_source_owner(),
  admin: () => m.review_changes_source_admin(),
  import: () => m.review_changes_source_import(),
  system: () => m.review_changes_source_system(),
};
const ACTION: Record<IChangeRow["action"], () => string> = {
  create: () => m.review_changes_action_create(),
  update: () => m.review_changes_action_update(),
  status_change: () => m.review_changes_action_status_change(),
  revert: () => m.review_changes_action_revert(),
  delete: () => m.review_changes_action_delete(),
};

export function entityLabel(value: IChangeRow["entityType"]) {
  return ENTITY[value]();
}
export function sourceLabel(value: IChangeRow["source"]) {
  return SOURCE[value]();
}
export function actionLabel(value: IChangeRow["action"]) {
  return ACTION[value]();
}
