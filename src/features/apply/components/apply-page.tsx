import { useMemo, useState } from "react";

import { useIsClient } from "@/hooks/use-is-client";
import { REVIEW_STALE_DAYS } from "@/constants/moderation";
import { m } from "@/paraglide/messages";

import type {
  ApplicationFormValues,
  SubmitApplicationResult,
} from "../apply-schemas";
import { emptyApplication } from "../apply-defaults";
import { readApplyDraft } from "../hooks/use-apply-draft";
import ApplyForm from "./apply-form";
import ApplySent from "./apply-sent";

interface IApplyPageProps {
  resubmitToken?: string;
  // Null means the edit link is no longer usable.
  initial?: ApplicationFormValues | null;
}

interface ISent {
  status: "verify" | "received";
  email: string;
}

export default function ApplyPage({ resubmitToken, initial }: IApplyPageProps) {
  const [sent, setSent] = useState<ISent | null>(null);
  const isClient = useIsClient();
  // The draft lives in this browser only, so it can be read after hydration; the form then remounts with it.
  const draft = useMemo(
    () => (isClient && !resubmitToken ? readApplyDraft() : null),
    [isClient, resubmitToken],
  );
  const expired = resubmitToken !== undefined && !initial;

  function handleSent(result: SubmitApplicationResult, email: string) {
    if (result.status === "verify" || result.status === "received")
      setSent({ status: result.status, email });
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{m.apply_title()}</h1>
      <p>
        {resubmitToken
          ? m.apply_resubmit_intro()
          : m.apply_intro({ days: REVIEW_STALE_DAYS })}
      </p>
      {sent ? (
        <ApplySent status={sent.status} email={sent.email} />
      ) : expired ? (
        <p role="alert">{m.apply_resubmit_expired()}</p>
      ) : (
        <ApplyForm
          key={draft ? "draft" : "fresh"}
          initial={
            initial ?? (draft ? { ...emptyApplication(), ...draft } : undefined)
          }
          draftRestored={Boolean(draft)}
          resubmitToken={resubmitToken}
          onSent={handleSent}
        />
      )}
    </section>
  );
}
