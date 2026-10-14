import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import PageContainer from "@/components/custom/layout/page-container";
import { m } from "@/paraglide/messages";

import { adminEntriesQueryOptions } from "../admin-entries-queries";
import {
  ADMIN_ENTRIES_PAGE_SIZE,
  type AdminEntriesSearch,
} from "../admin-entries-schemas";
import type { IEntryDialog } from "../entry-dialog-state";
import EntriesFilters from "./entries-filters";
import EntriesTable from "./entries-table";
import EntryDialogs from "./entry-dialogs";

interface IEntriesPageProps {
  search: AdminEntriesSearch;
}

export default function EntriesPage({ search }: IEntriesPageProps) {
  const navigate = useNavigate({ from: "/admin/entries" });
  const { data } = useQuery({
    ...adminEntriesQueryOptions(search),
    // Keep the current rows on screen while the next filter or page loads.
    placeholderData: keepPreviousData,
  });
  const [dialog, setDialog] = useState<IEntryDialog | null>(null);

  function update(patch: Partial<AdminEntriesSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <PageContainer size="wide">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{m.admin_entries_title()}</h1>
        <p>{m.admin_entries_intro()}</p>
      </header>
      <EntriesFilters
        // Remounts when the URL changes (back button, shared link) so the search box never shows a stale filter.
        key={search.q ?? ""}
        value={search}
        onChange={update}
      />
      <p role="status">{m.admin_entries_count({ count: data?.total ?? 0 })}</p>
      {data && data.rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p>{m.admin_entries_none()}</p>
          {search.page > 1 && (
            <Button
              type="button"
              variant="outline"
              className="max-sm:min-h-11"
              onClick={() => update({ page: 1 })}
            >
              {m.admin_entries_first_page()}
            </Button>
          )}
        </div>
      ) : (
        <EntriesTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          pagination={{
            pageIndex: search.page - 1,
            pageSize: data?.pageSize ?? ADMIN_ENTRIES_PAGE_SIZE,
          }}
          onPageChange={(pageIndex) => update({ page: pageIndex + 1 })}
          onDialog={setDialog}
        />
      )}
      <EntryDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </PageContainer>
  );
}
