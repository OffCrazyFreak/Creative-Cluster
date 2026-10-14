import { Link } from "@tanstack/react-router";
import { useState } from "react";

import PageContainer from "@/components/custom/layout/page-container";
import { Button } from "@/components/ui/button";
import FormError from "@/features/auth/components/form-error";
import { m } from "@/paraglide/messages";

import { removeImportedListing } from "../claims.functions";

interface IClaimRemovePageProps {
  token: string;
  invite: { entryName: string } | null;
}

type RemoveState = "ready" | "done" | "error";

export default function ClaimRemovePage({
  token,
  invite,
}: IClaimRemovePageProps) {
  const [state, setState] = useState<RemoveState>("ready");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const result = await removeImportedListing({ data: { token } });
      setState(result.status === "ok" ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer size="narrow">
      <h1 className="text-2xl font-semibold">{m.auth_claim_remove_title()}</h1>
      {state === "done" ? (
        <p role="status">{m.auth_claim_remove_done()}</p>
      ) : state === "error" || !invite ? (
        <>
          <FormError message={m.auth_claim_remove_invalid()} />
          <Link to="/">{m.auth_claim_remove_home()}</Link>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p>{m.auth_claim_remove_intro({ entryName: invite.entryName })}</p>
          <p>{m.auth_claim_remove_effect()}</p>
          <div>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              {m.auth_claim_remove_submit()}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
