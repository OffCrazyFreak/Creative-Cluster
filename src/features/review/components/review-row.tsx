import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { countryName } from "@/features/directory/country-name";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { reviewTypeLabel } from "../review-labels";
import { removesPost } from "../review-rows";
import type { IReviewRow } from "../review-schemas";
import ReviewAge from "./review-age";

interface IReviewRowProps {
  row: IReviewRow;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

export default function ReviewRow({
  row,
  selected,
  onSelect,
  onApprove,
  onReject,
}: IReviewRowProps) {
  const isReport = row.type === "report";
  const removes = removesPost(row);
  const place = [
    row.city,
    row.countryCode && countryName(row.countryCode, getLocale()),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        {row.decidable && !removes && (
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            aria-label={m.review_select_item({ name: row.label })}
          />
        )}
      </TableCell>
      <TableCell className="max-w-xs whitespace-normal">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.label}</span>
          {row.kind && <span className="text-xs">{row.kind}</span>}
          {row.postedBy && (
            <span className="text-xs">
              {m.review_posted_by({ name: row.postedBy })}
            </span>
          )}
          {place && <span className="text-xs">{place}</span>}
          {row.contactEmail && (
            <span className="text-xs break-all">
              {m.review_contact({ email: row.contactEmail })}
            </span>
          )}
          {(row.type === "application" ||
            row.type === "untrusted_edit" ||
            (isReport && !removes)) && (
            <Link
              to="/admin/entry/$id"
              params={{ id: row.entityId }}
              className="text-xs"
            >
              {m.review_open_listing()}
            </Link>
          )}
          {removes && (
            <Link
              to="/opportunities/$id"
              params={{ id: row.entityId }}
              className="text-xs"
            >
              {m.review_open_post()}
            </Link>
          )}
          {row.summary && (
            <details>
              <summary className="cursor-pointer text-xs">
                {m.review_show_text()}
              </summary>
              <p className="pt-1 text-sm whitespace-pre-line">{row.summary}</p>
            </details>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{reviewTypeLabel(row.type)}</Badge>
          {row.automatic && (
            <Badge variant="outline">{m.review_automatic()}</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <ReviewAge days={row.ageDays} stale={row.stale} />
      </TableCell>
      <TableCell>
        {row.decidable && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onApprove}>
              {removes
                ? m.review_remove()
                : isReport
                  ? m.review_resolve()
                  : m.review_approve()}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onReject}
            >
              {isReport ? m.review_dismiss() : m.review_reject()}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
