import { useMemo } from "react";
import { useTable } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "@/paraglide/messages";

import type { IAdminTagRow } from "../tag-schemas";
import { createTagColumns, type ITagColumnActions } from "./tag-columns";
import { tagTableFeatures } from "./tag-table-features";

interface ITagsTableProps extends ITagColumnActions {
  rows: IAdminTagRow[];
}

const ALL = "all";

export default function TagsTable({ rows, onEdit, onMerge }: ITagsTableProps) {
  const columns = useMemo(
    () => createTagColumns({ onEdit, onMerge }),
    [onEdit, onMerge],
  );
  const table = useTable({ features: tagTableFeatures, columns, data: rows });
  const labelColumn = table.getColumn("labelEn");
  const statusColumn = table.getColumn("status");
  const statuses = [
    ["active", m.tags_admin_status_active()],
    ["suggested", m.tags_admin_status_suggested()],
    ["rejected", m.tags_admin_status_rejected()],
    ["merged", m.tags_admin_status_merged()],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          aria-label={m.tags_admin_filter()}
          placeholder={m.tags_admin_filter()}
          onChange={(e) => labelColumn?.setFilterValue(e.target.value)}
        />
        <Select
          value={(statusColumn?.getFilterValue() as string | undefined) ?? ALL}
          onValueChange={(value) =>
            statusColumn?.setFilterValue(value === ALL ? undefined : value)
          }
        >
          <SelectTrigger aria-label={m.tags_admin_col_status()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{m.tags_admin_status_all()}</SelectItem>
            {statuses.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                >
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
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
