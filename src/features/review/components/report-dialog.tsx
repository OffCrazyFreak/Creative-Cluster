import { useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FormError from "@/features/auth/components/form-error";
import {
  REPORT_MESSAGE_MAX,
  REPORT_REASONS,
  type ReportReason,
} from "@/constants/review";
import { m } from "@/paraglide/messages";

import { reportReasonLabel } from "../review-labels";

export interface IReportSubmission {
  // Only set when the dialog asks for a reason.
  reason?: ReportReason;
  message: string;
  turnstileToken: string;
  fax: string;
}

interface IReportDialogProps {
  trigger: string;
  title: string;
  description: string;
  // Opportunity reports carry only a message; entry reports also pick a reason.
  withReason?: boolean;
  messageMax?: number;
  send: (
    submission: IReportSubmission,
  ) => Promise<"sent" | "captcha" | "limited">;
}

export default function ReportDialog({
  trigger,
  title,
  description,
  withReason = false,
  messageMax = REPORT_MESSAGE_MAX,
  send,
}: IReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("inaccurate");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openRef = useRef(false);

  function resetCheck(text: string | null) {
    setError(text);
    // A Turnstile token works once, so every attempt needs a fresh widget.
    setToken(null);
    setWidgetKey((key) => key + 1);
  }

  async function submit() {
    setError(null);
    if (!token) {
      setError(m.review_report_error_wait());
      return;
    }
    setBusy(true);
    try {
      const result = await send({
        reason: withReason ? reason : undefined,
        message,
        turnstileToken: token,
        fax: honeypot,
      });
      // The dialog may have closed while the request ran; its error text would show up on reopening.
      if (!openRef.current && result !== "sent") return;
      if (result === "captcha") resetCheck(m.review_report_error_captcha());
      else if (result === "limited") resetCheck(m.review_report_error_limit());
      else {
        toast.success(m.review_report_sent());
        setOpen(false);
        openRef.current = false;
        setMessage("");
        resetCheck(null);
      }
    } catch {
      if (openRef.current) resetCheck(m.review_report_error());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        openRef.current = next;
        if (!next) setBusy(false);
        // The widget unmounts with the dialog, so a token kept from before would be stale on reopening.
        if (!next) resetCheck(null);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {withReason && (
          <Field>
            <FieldLabel htmlFor="report-reason">
              {m.review_report_reason()}
            </FieldLabel>
            <Select
              items={REPORT_REASONS.map((item) => ({
                value: item,
                label: reportReasonLabel(item),
              }))}
              value={reason}
              onValueChange={(next) =>
                setReason(
                  REPORT_REASONS.find((item) => item === next) ?? "inaccurate",
                )
              }
            >
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {reportReasonLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="report-message">
            {m.review_report_message()}
          </FieldLabel>
          <Textarea
            id="report-message"
            value={message}
            maxLength={messageMax}
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
            {m.review_report_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
