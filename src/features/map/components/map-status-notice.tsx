import { Alert, AlertDescription } from "@/components/ui/alert";
import { m } from "@/paraglide/messages";

import type { MapStatus } from "../map-frame-context";

interface IMapStatusNoticeProps {
  status: MapStatus;
}

export default function MapStatusNotice({ status }: IMapStatusNoticeProps) {
  if (status !== "unsupported" && status !== "failed") return null;
  return (
    <Alert>
      <AlertDescription>
        {status === "unsupported"
          ? m.map_webgl_unsupported()
          : m.map_load_failed()}
      </AlertDescription>
    </Alert>
  );
}
