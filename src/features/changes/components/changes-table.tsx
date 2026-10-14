import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { actionLabel, entityLabel, sourceLabel } from "../changes-labels";
import type { IChangeRow } from "../changes-schemas";

interface IChangesTableProps {
  rows: IChangeRow[];
  onView: (id: string) => void;
}

export default function ChangesTable({ rows, onView }: IChangesTableProps) {
  const format = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{m.review_changes_col_when()}</TableHead>
          <TableHead>{m.review_changes_col_record()}</TableHead>
          <TableHead>{m.review_changes_col_who()}</TableHead>
          <TableHead>{m.review_changes_col_what()}</TableHead>
          <TableHead>{m.review_changes_col_fields()}</TableHead>
          <TableHead>{m.review_changes_col_actions()}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{format.format(new Date(row.createdAt))}</TableCell>
            <TableCell className="whitespace-normal">
              {row.entityType === "entry" ? (
                <Link
                  to="/admin/entry/$id"
                  params={{ id: row.entityId }}
                  className="block"
                >
                  {row.label}
                </Link>
              ) : (
                <span className="block">{row.label}</span>
              )}
              <span className="block text-xs">
                {entityLabel(row.entityType)}
              </span>
            </TableCell>
            <TableCell className="whitespace-normal">
              {row.actor ?? sourceLabel(row.source)}
            </TableCell>
            <TableCell className="whitespace-normal">
              {actionLabel(row.action)}
              {row.reverted && (
                <Badge variant="secondary" className="ml-2">
                  {m.review_changes_reverted()}
                </Badge>
              )}
            </TableCell>
            <TableCell className="max-w-xs break-words whitespace-normal">
              {row.changedFields.join(", ")}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onView(row.id)}
              >
                {m.review_changes_view()}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
