import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useLifecycleAction } from "../hooks/use-lifecycle-action";
import {
  archiveOwnListingFn,
  confirmOwnListingFn,
  unarchiveOwnListingFn,
  withdrawConsentFn,
} from "../lifecycle.functions";
import {
  OWN_LISTING_KEY,
  ownListingStatusQueryOptions,
} from "../lifecycle-queries";
import { statusLabel } from "../status-label";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

// The owner's status block: suspension reason, "confirm up to date", hide and show again, consent withdrawal.
// Rendered on /account/data; the /account home can render the same component.
export default function ListingStatusPanel() {
  const { data } = useQuery(ownListingStatusQueryOptions());
  const run = useLifecycleAction(OWN_LISTING_KEY);
  const [consent, setConsent] = useState(false);
  if (data === undefined) return null;
  if (data === null) return <p>{m.lifecycle_owner_none()}</p>;

  const erasing = data.erasureRequestedAt !== null;
  const needsConsent = data.kind === "person" && !data.hasConsent;

  async function unarchive() {
    // Not a plain ok/failed action: "consent needed" and "unavailable" are different answers.
    await run(
      async () => {
        const result = await unarchiveOwnListingFn({ data: { consent } });
        return { ok: result.status === "ok" };
      },
      m.lifecycle_unarchive_done(),
      m.lifecycle_unarchive_unavailable(),
    );
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="listing-status">
      <h2 id="listing-status" className="text-xl font-semibold">
        {m.lifecycle_owner_title()}
      </h2>
      <p>{m.lifecycle_owner_status({ status: statusLabel(data.status) })}</p>
      {data.status === "suspended" && data.suspendedReason && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{m.lifecycle_owner_suspended_title()}</AlertTitle>
          <AlertDescription>
            {m.lifecycle_owner_suspended_body({
              reason: data.suspendedReason,
            })}
          </AlertDescription>
        </Alert>
      )}
      {erasing && (
        <Alert role="status">
          <AlertDescription>{m.lifecycle_owner_erasure()}</AlertDescription>
        </Alert>
      )}
      {data.status === "published" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {data.lastConfirmedAt
              ? m.lifecycle_confirm_last({
                  date: formatDate(data.lastConfirmedAt),
                })
              : m.lifecycle_confirm_hint()}
          </p>
          <div>
            <Button
              type="button"
              onClick={() =>
                void run(
                  () => confirmOwnListingFn(),
                  m.lifecycle_confirm_done(),
                )
              }
            >
              {m.lifecycle_confirm_button()}
            </Button>
          </div>
        </div>
      )}
      {data.status === "published" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{m.lifecycle_archive_hint()}</p>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void run(
                  () => archiveOwnListingFn(),
                  m.lifecycle_archive_done(),
                )
              }
            >
              {m.lifecycle_archive_button()}
            </Button>
          </div>
        </div>
      )}
      {data.status === "archived" && !erasing && (
        <div className="flex flex-col gap-3">
          {needsConsent && (
            <Field orientation="horizontal" className="items-start">
              <Checkbox
                id="unarchive-consent"
                checked={consent}
                onCheckedChange={setConsent}
              />
              <FieldLabel htmlFor="unarchive-consent">
                {m.lifecycle_unarchive_consent()}
              </FieldLabel>
            </Field>
          )}
          <div>
            <Button
              type="button"
              disabled={needsConsent && !consent}
              onClick={() => void unarchive()}
            >
              {m.lifecycle_unarchive_button()}
            </Button>
          </div>
        </div>
      )}
      {data.kind === "person" && data.hasConsent && !erasing && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{m.lifecycle_withdraw_hint()}</p>
          <div>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                void run(() => withdrawConsentFn(), m.lifecycle_withdraw_done())
              }
            >
              {m.lifecycle_withdraw_button()}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
