import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

import { adminEntryDetailQueryOptions } from "../admin-entries-queries";
import type { IEntryDialog } from "../entry-dialog-state";
import EntryDialogs from "./entry-dialogs";
import EntryFieldsList from "./entry-fields-list";
import StatusHistory from "./status-history";

interface IEntryDetailProps {
  id: string;
}

// Sits under the lifecycle actions of the admin entry page: owner, every stored field, history and open reviews.
export default function EntryDetail({ id }: IEntryDetailProps) {
  const { data } = useQuery(adminEntryDetailQueryOptions(id));
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<IEntryDialog | null>(null);
  if (!data) return null;
  const row = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    kind: data.kind,
  };
  const isStub = data.kind === "outside_partner";

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-8 sm:px-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          {m.admin_entries_manage_title()}
        </h2>
        <div className="flex flex-wrap gap-2">
          {!isStub && (
            <Button
              type="button"
              variant="outline"
              className="max-sm:min-h-11"
              onClick={() => setDialog({ kind: "transfer", row })}
            >
              {m.admin_entries_action_transfer()}
            </Button>
          )}
          {isStub && (
            <Button
              type="button"
              variant="outline"
              className="max-sm:min-h-11"
              onClick={() => setDialog({ kind: "merge", row })}
            >
              {m.admin_entries_action_merge()}
            </Button>
          )}
          {data.kind !== "person" && (
            <Button
              type="button"
              variant="outline"
              className="max-sm:min-h-11"
              onClick={() => setDialog({ kind: "pin", row })}
            >
              {m.admin_entries_action_pin()}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="max-sm:min-h-11"
            onClick={() => setDialog({ kind: "slug", row })}
          >
            {m.admin_entries_action_slug()}
          </Button>
        </div>
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          {m.admin_entries_reviews_title()}
        </h2>
        {data.reviews.length === 0 ? (
          <p>{m.admin_entries_reviews_none()}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {data.reviews.map((item) => (
                <li key={item.id}>
                  {m.admin_entries_review_item({
                    type: item.type,
                    date: formatDate(item.createdAt),
                  })}
                </li>
              ))}
            </ul>
            <Link to="/admin" className="self-start">
              {m.admin_entries_reviews_open_queue()}
            </Link>
          </>
        )}
      </section>
      <StatusHistory entryId={data.id} history={data.history} />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          {m.admin_entries_fields_title()}
        </h2>
        <EntryFieldsList fields={data.fields} />
      </section>
      <EntryDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onMerged={() => void navigate({ to: "/admin/entries" })}
      />
    </section>
  );
}
