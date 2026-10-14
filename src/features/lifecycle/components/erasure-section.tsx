import { useQuery } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ERASURE_GRACE_DAYS } from "@/constants/lifecycle";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useLifecycleAction } from "../hooks/use-lifecycle-action";
import { cancelErasureFn, requestErasureFn } from "../lifecycle.functions";
import {
  ERASURE_KEY,
  OWN_LISTING_KEY,
  erasureStateQueryOptions,
} from "../lifecycle-queries";

export default function ErasureSection() {
  const { data } = useQuery(erasureStateQueryOptions());
  const run = useLifecycleAction(ERASURE_KEY);
  const refreshListing = useLifecycleAction(OWN_LISTING_KEY);
  if (!data) return null;

  const date = data.scheduledFor
    ? new Intl.DateTimeFormat(getLocale(), {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(data.scheduledFor))
    : null;

  async function request() {
    await run(
      () => requestErasureFn().then(() => ({ ok: true })),
      m.lifecycle_erase_scheduled_toast(),
    );
    await refreshListing(() => Promise.resolve({ ok: true }), "");
  }

  async function cancel() {
    await run(() => cancelErasureFn(), m.lifecycle_erase_cancelled());
    await refreshListing(() => Promise.resolve({ ok: true }), "");
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="erase-title">
      <h2 id="erase-title" className="text-xl font-semibold">
        {m.lifecycle_erase_title()}
      </h2>
      {date ? (
        <>
          <Alert role="status">
            <AlertDescription>
              {m.lifecycle_erase_scheduled({ date })}
            </AlertDescription>
          </Alert>
          <div>
            <Button type="button" onClick={() => void cancel()}>
              {m.lifecycle_erase_cancel()}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            {m.lifecycle_erase_body({ days: ERASURE_GRACE_DAYS })}
          </p>
          <div>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button type="button" variant="destructive" />}
              >
                {m.lifecycle_erase_button()}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {m.lifecycle_erase_confirm_title()}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {m.lifecycle_erase_confirm_body({
                      days: ERASURE_GRACE_DAYS,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void request()}>
                    {m.lifecycle_erase_confirm()}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </section>
  );
}
