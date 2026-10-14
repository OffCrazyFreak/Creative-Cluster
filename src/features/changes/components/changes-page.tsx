import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { changesQueryOptions } from "../changes-queries";
import type { ChangesListInput } from "../changes-schemas";
import ChangeDialog from "./change-dialog";
import ChangesFilters from "./changes-filters";
import ChangesTable from "./changes-table";

interface IChangesPageProps {
  search: ChangesListInput;
}

export default function ChangesPage({ search }: IChangesPageProps) {
  const navigate = useNavigate({ from: "/admin/changes" });
  const { data } = useQuery(changesQueryOptions(search));
  const [viewing, setViewing] = useState<string | null>(null);
  const rows = data?.rows ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function update(patch: Partial<ChangesListInput>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{m.review_changes_title()}</h1>
        <p>{m.review_changes_intro()}</p>
      </header>
      <ChangesFilters value={search} onChange={update} />
      {rows.length === 0 ? (
        <p>{m.review_changes_none()}</p>
      ) : (
        <div className="overflow-x-auto">
          <ChangesTable rows={rows} onView={setViewing} />
        </div>
      )}
      {pages > 1 && (
        <nav
          className="flex items-center gap-4"
          aria-label={m.review_changes_title()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={search.page <= 1}
            onClick={() => update({ page: search.page - 1 })}
          >
            {m.review_prev()}
          </Button>
          <span>{m.review_page({ page: search.page, pages })}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={search.page >= pages}
            onClick={() => update({ page: search.page + 1 })}
          >
            {m.review_next()}
          </Button>
        </nav>
      )}
      {viewing && (
        <ChangeDialog id={viewing} onClose={() => setViewing(null)} />
      )}
    </section>
  );
}
