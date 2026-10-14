import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

interface IErasureNoticeProps {
  requestedAt: string;
}

export default function ErasureNotice({ requestedAt }: IErasureNoticeProps) {
  return (
    <Alert>
      <AlertTitle>{m.account_home_erasure_title()}</AlertTitle>
      <AlertDescription>
        {m.account_home_erasure_body({ date: formatDate(requestedAt) })}
      </AlertDescription>
    </Alert>
  );
}
