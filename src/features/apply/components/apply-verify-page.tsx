import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import FormError from "@/features/auth/components/form-error";
import { REVIEW_STALE_DAYS } from "@/constants/moderation";
import { m } from "@/paraglide/messages";

import type { VerifyApplicationResult } from "../apply-schemas";
import { confirmApplicationEmail } from "../apply.functions";

interface IApplyVerifyPageProps {
  token: string | undefined;
  preview: { entryName: string } | null;
}

// The link in the mail only opens this page: mail scanners follow links, and confirming needs a person's click.
export default function ApplyVerifyPage({
  token,
  preview,
}: IApplyVerifyPageProps) {
  const [result, setResult] = useState<VerifyApplicationResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    setFailed(false);
    try {
      setResult(await confirmApplicationEmail({ data: { token } }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const entryName =
    result && result.status !== "invalid"
      ? result.entryName
      : preview?.entryName;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">
        {result?.status === "verified"
          ? m.apply_verify_done_title()
          : m.apply_verify_title()}
      </h1>
      {result?.status === "verified" && (
        <p role="status">
          {m.apply_verify_done_body({
            entryName: result.entryName,
            days: REVIEW_STALE_DAYS,
          })}
        </p>
      )}
      {result?.status === "already" && (
        <p role="status">
          {m.apply_verify_already({ entryName: result.entryName })}
        </p>
      )}
      {(result?.status === "invalid" || (!result && !preview)) && (
        <>
          <p role="alert">{m.apply_verify_invalid()}</p>
          <Link to="/apply">{m.apply_title()}</Link>
        </>
      )}
      {!result && preview && entryName && (
        <>
          <p>{m.apply_verify_body({ entryName })}</p>
          <FormError message={failed ? m.apply_verify_failed() : null} />
          <Button type="button" disabled={busy} onClick={() => void confirm()}>
            {m.apply_verify_button()}
          </Button>
        </>
      )}
    </section>
  );
}
