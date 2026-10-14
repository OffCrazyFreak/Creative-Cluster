import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { m } from "@/paraglide/messages";

import type { IFieldDiff } from "../changes-schemas";

interface IDiffTableProps {
  diffs: IFieldDiff[];
}

// The rich-text JSON is long and unreadable; its plain text column shows the same change.
function visible(diffs: IFieldDiff[]): IFieldDiff[] {
  const hasText = diffs.some((diff) => diff.field === "descriptionText");
  return hasText ? diffs.filter((diff) => diff.field !== "description") : diffs;
}

export default function DiffTable({ diffs }: IDiffTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.review_changes_col_field()}</TableHead>
            <TableHead>{m.review_changes_col_before()}</TableHead>
            <TableHead>{m.review_changes_col_now()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible(diffs).map((diff) => (
            <TableRow key={diff.field}>
              <TableCell className="align-top">
                {diff.field}
                {!diff.restorable && (
                  <span className="block text-xs">
                    {m.review_changes_not_restorable()}
                  </span>
                )}
              </TableCell>
              <TableCell className="max-w-xs align-top break-words whitespace-pre-wrap">
                {diff.before}
              </TableCell>
              <TableCell className="max-w-xs align-top break-words whitespace-pre-wrap">
                {diff.current}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
