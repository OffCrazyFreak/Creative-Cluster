import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

export default function ContactSent() {
  return (
    <div className="flex flex-col gap-4">
      <Alert role="status">
        <AlertTitle>{m.contact_sent_title()}</AlertTitle>
        <AlertDescription>{m.contact_sent_body()}</AlertDescription>
      </Alert>
      <DialogClose render={<Button type="button" variant="outline" />}>
        {m.contact_close()}
      </DialogClose>
    </div>
  );
}
