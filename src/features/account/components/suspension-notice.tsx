import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { m } from "@/paraglide/messages";

interface ISuspensionNoticeProps {
  reason: string | null;
}

export default function SuspensionNotice({ reason }: ISuspensionNoticeProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{m.account_suspended_title()}</AlertTitle>
      <AlertDescription>
        <p>{m.account_suspended_body()}</p>
        <p>{reason ?? m.account_suspended_no_reason()}</p>
      </AlertDescription>
    </Alert>
  );
}
