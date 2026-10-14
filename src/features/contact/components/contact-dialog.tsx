import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import ContactForm from "./contact-form";
import ContactSent from "./contact-sent";

interface IContactDialogProps {
  entryId: string;
  name: string;
  triggerLabel?: string;
  // Starting text for the message, for example a reference to the post being answered.
  defaultMessage?: string;
}

export default function ContactDialog({
  entryId,
  name,
  triggerLabel,
  defaultMessage,
}: IContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  function changeOpen(next: boolean) {
    setOpen(next);
    // Reset on open: a send that finishes after closing cannot leave the next visit on "sent".
    if (next) setSent(false);
  }

  return (
    // A stray tap outside must not throw away a long message; Escape and Close still work.
    <Dialog open={open} onOpenChange={changeOpen} disablePointerDismissal>
      <DialogTrigger render={<Button type="button" />}>
        {triggerLabel ?? m.contact_button()}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.contact_title({ name })}</DialogTitle>
          <DialogDescription>{m.contact_intro()}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <ContactSent />
        ) : (
          <ContactForm
            entryId={entryId}
            defaultMessage={defaultMessage}
            onSent={() => setSent(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
