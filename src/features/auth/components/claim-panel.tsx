import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { claimImportedListing } from "../auth.functions";
import FormError from "./form-error";
import NewPasswordForm from "./new-password-form";

interface IClaimPanelProps {
  token: string;
  entryName: string;
  email: string;
}

type ClaimState =
  | { step: "ready" }
  | { step: "password"; passwordToken: string }
  | { step: "linked" }
  | { step: "error"; message: string };

export default function ClaimPanel({
  token,
  entryName,
  email,
}: IClaimPanelProps) {
  const [state, setState] = useState<ClaimState>({ step: "ready" });
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    try {
      const result = await claimImportedListing({ data: { token } });
      if (result.status === "invalid")
        setState({ step: "error", message: m.auth_claim_invalid() });
      else if (result.status === "taken")
        setState({ step: "error", message: m.auth_claim_taken() });
      else if (result.passwordToken)
        setState({ step: "password", passwordToken: result.passwordToken });
      else setState({ step: "linked" });
    } catch {
      setState({ step: "error", message: m.auth_claim_failed() });
    } finally {
      setBusy(false);
    }
  }

  if (state.step === "error") {
    return <FormError message={state.message} />;
  }
  if (state.step === "linked") {
    return (
      <Link to="/login" className={buttonVariants()}>
        {m.auth_login_submit()}
      </Link>
    );
  }
  if (state.step === "password") {
    return (
      <div className="flex flex-col gap-4">
        <p>{m.auth_claim_next()}</p>
        <NewPasswordForm token={state.passwordToken} mode="invite" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p>{m.auth_claim_intro({ entryName })}</p>
      <p>{m.auth_claim_email({ email })}</p>
      <Button type="button" disabled={busy} onClick={() => void claim()}>
        {m.auth_claim_submit()}
      </Button>
    </div>
  );
}
