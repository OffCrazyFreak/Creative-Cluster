import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { m } from "@/paraglide/messages";

import type { IReviewRow } from "../review-schemas";
import ReviewRow from "./review-row";

interface IReviewTableProps {
  rows: IReviewRow[];
  selected: ReadonlySet<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onApprove: (row: IReviewRow) => void;
  onReject: (row: IReviewRow) => void;
}

export default function ReviewTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onApprove,
  onReject,
}: IReviewTableProps) {
  const decidable = rows.filter(
    (row) =>
      row.decidable &&
      !(row.type === "report" && row.entityType === "opportunity"),
  );
  const allSelected =
    decidable.length > 0 && decidable.every((row) => selected.has(row.id));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleAll}
              aria-label={m.review_select_all()}
            />
          </TableHead>
          <TableHead>{m.review_col_item()}</TableHead>
          <TableHead>{m.review_col_type()}</TableHead>
          <TableHead>{m.review_col_age()}</TableHead>
          <TableHead>{m.review_col_actions()}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <ReviewRow
            key={row.id}
            row={row}
            selected={selected.has(row.id)}
            onSelect={(checked) => onToggle(row.id, checked)}
            onApprove={() => onApprove(row)}
            onReject={() => onReject(row)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
