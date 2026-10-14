import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import PageContainer from "@/components/custom/layout/page-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OPPORTUNITY_LIMITS } from "@/constants/opportunities";
import { m } from "@/paraglide/messages";

import { useOpportunityActions } from "../hooks/use-opportunity-actions";
import { refusedLabel } from "../opportunity-labels";
import { emptyOpportunityValues } from "../opportunity-defaults";
import { myOpportunitiesQuery } from "../opportunity-queries";
import type { OpportunityResult } from "../opportunity-schemas";
import OpportunityForm from "./opportunity-form";
import OwnOpportunityCard from "./own-opportunity-card";

// "new" is the form for a fresh post; any other string is the id of the post being edited.
type Editing = string | null;

function noticeOf(result: OpportunityResult | undefined) {
  if (!result) return m.opportunities_notice_failed();
  if (result.status === "refused") return refusedLabel(result.code);
  if (result.status === "published") return m.opportunities_notice_published();
  if (result.status === "pending_review")
    return m.opportunities_notice_pending();
  return m.opportunities_notice_saved();
}

export default function MyOpportunitiesPage() {
  const { data } = useSuspenseQuery(myOpportunitiesQuery());
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const actions = useOpportunityActions(data.entry?.id ?? "");
  const busy = actions.renew.isPending || actions.fill.isPending;

  async function run(
    action: () => Promise<OpportunityResult | void>,
    success: string,
  ) {
    setNotice(null);
    try {
      const result = await action();
      setNotice(
        result && result.status === "refused"
          ? refusedLabel(result.code)
          : success,
      );
    } catch {
      setNotice(m.opportunities_notice_failed());
    }
  }

  const canPost = data.canPost && editing === null;
  return (
    <PageContainer size="prose">
      <h1 className="text-2xl font-semibold">{m.opportunities_title()}</h1>
      <p>{m.opportunities_intro()}</p>
      {!data.entry ? (
        <p>{m.opportunities_no_entry()}</p>
      ) : data.entry.status !== "published" ? (
        <p>{m.opportunities_entry_not_published()}</p>
      ) : (
        <>
          <p>
            {m.opportunities_open_count({
              count: data.openCount,
              max: OPPORTUNITY_LIMITS.activePerEntry,
            })}{" "}
            {data.items.length === 0 ? m.opportunities_review_note() : null}
          </p>
          <div aria-live="polite">
            {notice ? (
              <Alert>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          {editing === "new" ? (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">
                {m.opportunities_form_new()}
              </h2>
              <OpportunityForm
                initial={emptyOpportunityValues()}
                submitLabel={m.opportunities_action_post()}
                onSubmit={(values) => actions.create.mutateAsync(values)}
                onDone={(result) => {
                  setNotice(noticeOf(result));
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </section>
          ) : canPost ? (
            <Button className="self-start" onClick={() => setEditing("new")}>
              {m.opportunities_new()}
            </Button>
          ) : editing === null ? (
            <p>
              {m.opportunities_limit_reached({
                max: OPPORTUNITY_LIMITS.activePerEntry,
              })}
            </p>
          ) : null}
          {data.items.length === 0 && editing !== "new" ? (
            <p>{m.opportunities_empty()}</p>
          ) : (
            <ul
              aria-label={m.opportunities_list_label()}
              className="flex flex-col gap-4"
            >
              {data.items.map((item) => (
                <li key={item.id}>
                  {editing === item.id ? (
                    <OpportunityForm
                      initial={item.values}
                      submitLabel={m.opportunities_action_save()}
                      onSubmit={(values) =>
                        actions.update.mutateAsync({ id: item.id, values })
                      }
                      onDone={(result) => {
                        setNotice(noticeOf(result));
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <OwnOpportunityCard
                      item={item}
                      busy={busy}
                      onEdit={() => setEditing(item.id)}
                      onRenew={(deadline) =>
                        void run(
                          () =>
                            actions.renew.mutateAsync({
                              id: item.id,
                              deadline,
                            }),
                          m.opportunities_notice_renewed(),
                        )
                      }
                      onFill={() =>
                        void run(
                          () => actions.fill.mutateAsync(item.id),
                          m.opportunities_notice_filled(),
                        )
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}
