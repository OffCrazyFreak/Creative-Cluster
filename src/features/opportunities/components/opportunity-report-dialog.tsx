import { useState } from "react";
import { toast } from "sonner";

import TurnstileField from "@/components/custom/form/turnstile-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { OPPORTUNITY_REPORT_MESSAGE_MAX } from "@/constants/opportunities";
import FormError from "@/features/auth/components/form-error";
import { m } from "@/paraglide/messages";

import { reportOpportunityFn } from "../opportunity-public.functions";

interface IOpportunityReportDialogProps {
  id: string;
}

export default function OpportunityReportDialog({
  id,
}: IOpportunityReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetCheck(text: string | null) {
    setError(text);
    // A Turnstile token works once, so every attempt needs a fresh widget.
    setToken(null);
    setWidgetKey((key) => key + 1);
  }

  async function submit() {
    setError(null);
    if (!token) {
      setError(m.opportunities_report_error_wait());
      return;
    }
    setBusy(true);
    try {
      const result = await reportOpportunityFn({
        data: { id, message, turnstileToken: token, fax: honeypot },
      });
      if (result.status === "captcha")
        resetCheck(m.opportunities_report_error_captcha());
      else if (result.status === "limited")
        resetCheck(m.opportunities_report_error_limit());
      else {
        toast.success(m.opportunities_report_sent());
        setOpen(false);
        setMessage("");
        resetCheck(null);
      }
    } catch {
      resetCheck(m.opportunities_report_error());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        {m.opportunities_report_button()}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.opportunities_report_title()}</DialogTitle>
          <DialogDescription>{m.opportunities_report_body()}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="opportunity-report-message">
            {m.opportunities_report_message()}
          </FieldLabel>
          <Textarea
            id="opportunity-report-message"
            value={message}
            maxLength={OPPORTUNITY_REPORT_MESSAGE_MAX}
            onChange={(event) => setMessage(event.target.value)}
          />
        </Field>
        <div aria-hidden="true" className="sr-only">
          <input
            name="fax"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>
        {open && (
          <TurnstileField
            key={widgetKey}
            onToken={setToken}
            onExpire={() => setToken(null)}
          />
        )}
        <FormError message={error} />
        <DialogFooter>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {m.opportunities_report_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
