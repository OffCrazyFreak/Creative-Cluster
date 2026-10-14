import type { IAdminEntryRow } from "./admin-entries-schemas";

export type EntryDialogKind = "suspend";

export interface IEntryDialog {
  kind: EntryDialogKind;
  row: Pick<IAdminEntryRow, "id" | "name" | "slug" | "kind">;
}
