import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { REVIEW_STALE_DAYS } from "@/constants/moderation";
import { m } from "@/paraglide/messages";

import { useReviewDecisions } from "../hooks/use-review-decisions";
import { reviewQueueQueryOptions } from "../review-queries";
import type { IReviewRow, ReviewListInput } from "../review-schemas";
import RejectDialog, { type IRejection } from "./reject-dialog";
import ReviewFilters from "./review-filters";
import ReviewTable from "./review-table";

function removesPost(row: IReviewRow): boolean {
  return row.type === "report" && row.entityType === "opportunity";
}

interface IReviewQueuePageProps {
  search: ReviewListInput;
}

export default function ReviewQueuePage({ search }: IReviewQueuePageProps) {
  const navigate = useNavigate({ from: "/admin/" });
  const { data } = useQuery({
    ...reviewQueueQueryOptions(search),
    placeholderData: keepPreviousData,
  });
  const decide = useReviewDecisions();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.rows ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  // Deciding the last item of the last page leaves that page empty; step back instead of saying nothing is waiting.
  useEffect(() => {
    if (data && data.total > 0 && search.page > pages)
      void navigate({ search: (prev) => ({ ...prev, page: pages }) });
  }, [data, pages, search.page, navigate]);

  function update(patch: Partial<ReviewListInput>) {
    setSelected(new Set());
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // One decision run at a time: a double click would otherwise report items as already decided.
  async function approve(ids: string[]) {
    if (busy) return;
    setBusy(true);
    await decide({ ids, decision: "approve" });
    setBusy(false);
  }

  // Applications and opportunities need a reason; reports, edits and tags are rejected in one click.
  async function startReject(ids: string[]) {
    const needsReason = rows.some(
      (row) =>
        ids.includes(row.id) &&
        (row.type === "application" || row.type === "opportunity"),
    );
    if (needsReason) setRejecting(ids);
    else if (!busy) {
      setBusy(true);
      await decide({ ids, decision: "reject" });
      setBusy(false);
    }
  }

  async function confirmReject(ids: string[], rejection: IRejection) {
    const ok = await decide({
      ids,
      decision: "reject",
      reasonCode: rejection.reasonCode,
      note: rejection.note || undefined,
    });
    if (ok) setRejecting(null);
  }

  async function confirmRemove(id: string, removal: IRejection) {
    const ok = await decide({
      ids: [id],
      decision: "approve",
      reasonCode: removal.reasonCode,
      note: removal.note || undefined,
    });
    if (ok) setRemoving(null);
  }

  // Decided items drop out of the list after the refetch, and out of the selection with them.
  const chosen = rows
    .filter((row) => selected.has(row.id))
    .map((row) => row.id);
  // Taking a post down needs its own reason, so those reports are never part of a bulk run.
  function decidableIds(list: IReviewRow[]) {
    return list
      .filter((row) => row.decidable && !removesPost(row))
      .map((row) => row.id);
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{m.review_title()}</h1>
        <p>{m.review_intro({ days: REVIEW_STALE_DAYS })}</p>
      </header>
      <ReviewFilters value={search} onChange={update} />
      {chosen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="status">
          <span>{m.review_selected({ count: chosen.length })}</span>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void approve(chosen)}
          >
            {m.review_approve_selected()}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void startReject(chosen)}
          >
            {m.review_reject_selected()}
          </Button>
        </div>
      )}
      {rows.length === 0 ? (
        <p>{m.review_empty()}</p>
      ) : (
        <div className="overflow-x-auto">
          <ReviewTable
            rows={rows}
            selected={selected}
            onToggle={toggle}
            onToggleAll={(checked) =>
              setSelected(checked ? new Set(decidableIds(rows)) : new Set())
            }
            onApprove={(row) =>
              removesPost(row) ? setRemoving(row.id) : void approve([row.id])
            }
            onReject={(row) => void startReject([row.id])}
          />
        </div>
      )}
      {pages > 1 && (
        <nav className="flex items-center gap-4" aria-label={m.review_title()}>
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
      {rejecting && (
        <RejectDialog
          count={rejecting.length}
          open
          onOpenChange={(open) => !open && setRejecting(null)}
          onConfirm={(rejection) => confirmReject(rejecting, rejection)}
        />
      )}
      {removing && (
        <RejectDialog
          count={1}
          mode="remove"
          open
          onOpenChange={(open) => !open && setRemoving(null)}
          onConfirm={(removal) => confirmRemove(removing, removal)}
        />
      )}
    </section>
  );
}
