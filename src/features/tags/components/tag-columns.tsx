import { createColumnHelper } from "@tanstack/react-table";

import { m } from "@/paraglide/messages";

import { foldText } from "../tag-label";
import type { IAdminTagRow } from "../tag-schemas";
import TagRowActions from "./tag-row-actions";
import type { tagTableFeatures } from "./tag-table-features";

const helper = createColumnHelper<typeof tagTableFeatures, IAdminTagRow>();

export function tagStatusKey(row: IAdminTagRow) {
  return row.canonicalId ? "merged" : row.status;
}

function statusLabel(row: IAdminTagRow) {
  const key = tagStatusKey(row);
  if (key === "merged") return m.tags_admin_status_merged();
  if (key === "suggested") return m.tags_admin_status_suggested();
  if (key === "rejected") return m.tags_admin_status_rejected();
  return m.tags_admin_status_active();
}

export interface ITagColumnActions {
  onEdit: (row: IAdminTagRow) => void;
  onMerge: (row: IAdminTagRow) => void;
}

export function createTagColumns(actions: ITagColumnActions) {
  return helper.columns([
    helper.accessor("labelEn", {
      header: m.tags_admin_col_label_en(),
      sortFn: "text",
      // Search covers both languages and every alias, accent-insensitively.
      filterFn: (row, _columnId, query: string) =>
        foldText(
          [
            row.original.labelEn,
            row.original.labelHr,
            ...row.original.aliasesEn,
            ...row.original.aliasesHr,
          ].join(" "),
        ).includes(foldText(query)),
    }),
    helper.accessor("labelHr", { header: m.tags_admin_col_label_hr() }),
    helper.accessor((row) => row.aliasesEn.concat(row.aliasesHr).join(", "), {
      id: "aliases",
      header: m.tags_admin_col_aliases(),
      enableSorting: false,
    }),
    helper.accessor(tagStatusKey, {
      id: "status",
      header: m.tags_admin_col_status(),
      filterFn: "equalsString",
      cell: ({ row }) => statusLabel(row.original),
    }),
    helper.accessor("usage", {
      header: m.tags_admin_col_usage(),
      sortFn: "alphanumeric",
    }),
    helper.accessor("suggestedByName", {
      header: m.tags_admin_col_suggested_by(),
      cell: ({ getValue }) => getValue() ?? "",
    }),
    helper.display({
      id: "actions",
      header: m.tags_admin_col_actions(),
      cell: ({ row }) => <TagRowActions row={row.original} {...actions} />,
    }),
  ]);
}
