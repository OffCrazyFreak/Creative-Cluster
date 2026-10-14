import { Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type PaginationState,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusLabel } from "@/features/lifecycle/status-label";
import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

import type { IAdminEntryRow } from "../admin-entries-schemas";
import type { IEntryDialog } from "../entry-dialog-state";
import { kindLabel } from "../entry-kind-label";
import EntriesPager from "./entries-pager";
import EntryRowActions from "./entry-row-actions";

interface IEntriesTableProps {
  rows: IAdminEntryRow[];
  total: number;
  pagination: PaginationState;
  onPageChange: (pageIndex: number) => void;
  onDialog: (dialog: IEntryDialog) => void;
}

const features = tableFeatures({ rowPaginationFeature });
const helper = createColumnHelper<typeof features, IAdminEntryRow>();

export default function EntriesTable({
  rows,
  total,
  pagination,
  onPageChange,
  onDialog,
}: IEntriesTableProps) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: () => m.admin_entries_col_name(),
          cell: ({ row }) => (
            <Link
              to="/admin/entry/$id"
              params={{ id: row.original.id }}
              className="font-medium"
            >
              {row.original.name}
            </Link>
          ),
        }),
        helper.display({
          id: "actions",
          header: () => (
            <span className="sr-only">{m.admin_entries_col_actions()}</span>
          ),
          cell: ({ row }) => (
            <EntryRowActions row={row.original} onDialog={onDialog} />
          ),
        }),
        helper.accessor("kind", {
          header: () => m.admin_entries_col_kind(),
          cell: ({ row }) => kindLabel(row.original.kind),
        }),
        helper.accessor("status", {
          header: () => m.admin_entries_col_status(),
          cell: ({ row }) => (
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={
                  row.original.status === "suspended"
                    ? "destructive"
                    : "secondary"
                }
              >
                {statusLabel(row.original.status)}
              </Badge>
              {!row.original.trusted && (
                <Badge variant="outline">{m.admin_entries_untrusted()}</Badge>
              )}
              {row.original.contactEmailInvalid && (
                <Badge variant="outline">
                  {m.admin_entries_email_invalid()}
                </Badge>
              )}
            </div>
          ),
        }),
        helper.accessor("countryCode", {
          header: () => m.admin_entries_col_country(),
          cell: ({ row }) => row.original.countryCode ?? "",
        }),
        helper.accessor("ownerEmail", {
          header: () => m.admin_entries_col_owner(),
          cell: ({ row }) =>
            row.original.ownerEmail ?? m.admin_entries_no_owner(),
        }),
        helper.accessor("lastConfirmedAt", {
          header: () => m.admin_entries_col_confirmed(),
          cell: ({ row }) =>
            row.original.lastConfirmedAt
              ? formatDate(row.original.lastConfirmedAt)
              : m.admin_entries_never(),
        }),
      ]),
    [onDialog],
  );
  const table = useTable({
    features,
    columns,
    data: rows,
    rowCount: total,
    manualPagination: true,
    state: { pagination },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      onPageChange(next.pageIndex);
    },
  });

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-normal">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <EntriesPager
        page={pagination.pageIndex + 1}
        pages={table.getPageCount()}
        onPrevious={() => table.previousPage()}
        onNext={() => table.nextPage()}
        canPrevious={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
      />
    </>
  );
}
