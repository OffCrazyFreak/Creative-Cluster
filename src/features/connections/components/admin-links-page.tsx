import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import PageContainer from "@/components/custom/layout/page-container";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import {
  ADMIN_LINKS_PAGE_SIZE,
  type AdminLinksSearch,
} from "../admin-links-schemas";
import { adminProposedLinksQuery } from "../connections-queries";
import AdminLinksFilters from "./admin-links-filters";
import AdminLinksTable from "./admin-links-table";

interface IAdminLinksPageProps {
  search: AdminLinksSearch;
}

export default function AdminLinksPage({ search }: IAdminLinksPageProps) {
  const navigate = useNavigate({ from: "/admin/links" });
  const { data } = useQuery({
    ...adminProposedLinksQuery(search),
    placeholderData: keepPreviousData,
  });

  const filtered = Boolean(search.q || search.kind || search.unclaimed);

  function update(patch: Partial<AdminLinksSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <PageContainer size="wide">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{m.admin_links_title()}</h1>
        <p>{m.admin_links_intro()}</p>
      </header>
      <AdminLinksFilters
        // Remounts when the URL changes (back button, shared link) so the search box never shows a stale filter.
        key={search.q ?? ""}
        value={search}
        onChange={update}
      />
      <p role="status">
        {data ? m.admin_links_count({ count: data.total }) : null}
      </p>
      {data && data.rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p>{filtered ? m.admin_links_none() : m.admin_links_none_at_all()}</p>
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
        <AdminLinksTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          pagination={{
            pageIndex: search.page - 1,
            pageSize: data?.pageSize ?? ADMIN_LINKS_PAGE_SIZE,
          }}
          onPageChange={(pageIndex) => update({ page: pageIndex + 1 })}
        />
      )}
    </PageContainer>
  );
}
