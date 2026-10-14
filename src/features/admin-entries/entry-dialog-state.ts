import type { IAdminEntryRow } from "./admin-entries-schemas";

export type EntryDialogKind = "suspend" | "transfer" | "merge" | "pin" | "slug";

export interface IEntryDialog {
  kind: EntryDialogKind;
  row: Pick<IAdminEntryRow, "id" | "name" | "slug" | "kind">;
}
