import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

import type { IOwnSummary } from "../listing-types";

interface IListingSummaryProps {
  listing: IOwnSummary;
}

const statusLabels = {
  draft: m.account_status_draft,
  pending: m.account_status_pending,
  published: m.account_status_published,
  suspended: m.account_status_suspended,
  rejected: m.account_status_rejected,
  archived: m.account_status_archived,
};

function dateLabel(iso: string | null): string {
  return iso ? formatDate(iso) : m.account_home_never();
}

export default function ListingSummary({ listing }: IListingSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{listing.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt>{m.account_home_status()}</dt>
          <dd>{statusLabels[listing.status]()}</dd>
          <dt>{m.account_home_updated()}</dt>
          <dd>{dateLabel(listing.updatedAt)}</dd>
          <dt>{m.account_home_confirmed()}</dt>
          <dd>{dateLabel(listing.lastConfirmedAt)}</dd>
          {listing.hasPendingEdit && (
            <>
              <dt>{m.account_home_pending()}</dt>
              <dd>{m.account_home_pending_value()}</dd>
            </>
          )}
        </dl>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Link to="/account/listing" className={buttonVariants()}>
          {m.account_home_edit()}
        </Link>
        {listing.status === "published" &&
          listing.kind !== "outside_partner" && (
            <Link
              to="/e/$slug"
              params={{ slug: listing.slug }}
              className={buttonVariants({ variant: "outline" })}
            >
              {m.account_home_view()}
            </Link>
          )}
      </CardFooter>
    </Card>
  );
}
