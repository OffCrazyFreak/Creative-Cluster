import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type PaginationState,
} from "@tanstack/react-table";
import { useMemo } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EntriesPager from "@/features/admin-entries/components/entries-pager";
import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

import type { IAdminLinkRow } from "../admin-links-schemas";
import { relationLabel } from "../relation-label";
import AdminLinksEntryCell from "./admin-links-entry-cell";
import AdminLinksRowActions from "./admin-links-row-actions";

interface IAdminLinksTableProps {
  rows: IAdminLinkRow[];
  total: number;
  pagination: PaginationState;
  onPageChange: (pageIndex: number) => void;
}

const features = tableFeatures({ rowPaginationFeature });
const helper = createColumnHelper<typeof features, IAdminLinkRow>();

export default function AdminLinksTable({
  rows,
  total,
  pagination,
  onPageChange,
}: IAdminLinksTableProps) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("proposer", {
          header: () => m.admin_links_col_proposer(),
          cell: ({ row }) => (
            <AdminLinksEntryCell entry={row.original.proposer} />
          ),
        }),
        helper.accessor("kind", {
          header: () => m.admin_links_col_relation(),
          cell: ({ row }) =>
            relationLabel(row.original.kind, row.original.direction),
        }),
        helper.accessor("recipient", {
          header: () => m.admin_links_col_recipient(),
          cell: ({ row }) => (
            <AdminLinksEntryCell entry={row.original.recipient} />
          ),
        }),
        helper.accessor("createdAt", {
          header: () => m.admin_links_col_proposed(),
          cell: ({ row }) => formatDate(row.original.createdAt),
        }),
        helper.accessor("expiresAt", {
          header: () => m.admin_links_col_expires(),
          cell: ({ row }) => formatDate(row.original.expiresAt),
        }),
        helper.display({
          id: "actions",
          header: () => (
            <span className="sr-only">{m.admin_entries_col_actions()}</span>
          ),
          cell: ({ row }) => <AdminLinksRowActions row={row.original} />,
        }),
      ]),
    [],
  );
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
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
        label={m.admin_links_pagination()}
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
