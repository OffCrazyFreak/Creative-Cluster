import { Loader2, LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { GeolocationStatus } from "../hooks/use-geolocation";

interface IMapLocateButtonProps {
  status: GeolocationStatus;
  onLocate: () => void;
}

const FAILURES: Partial<Record<GeolocationStatus, () => string>> = {
  approximate: m.map_near_me_approximate,
  denied: m.map_near_me_denied,
  unavailable: m.map_near_me_unavailable,
  timeout: m.map_near_me_timeout,
};

// The map's near-me control, above the zoom buttons.
export default function MapLocateButton({
  status,
  onLocate,
}: IMapLocateButtonProps) {
  const locating = status === "locating";
  // Counted rather than flagged: a browser without geolocation answers every tap with the
  // same status, which alone would not rerun the effect.
  const [taps, setTaps] = useState(0);
  const answered = useRef(0);

  // Over the map nothing else says why a locate failed, so every tap that fails gets a toast.
  // Only this button's own taps count: an automatic attempt fails quietly.
  useEffect(() => {
    if (taps === answered.current || status === "locating") return;
    answered.current = taps;
    const message = FAILURES[status]?.();
    if (!message) return;
    if (status === "approximate") toast.info(message);
    else toast.error(message);
  }, [taps, status]);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={m.map_near_me()}
      title={m.map_near_me()}
      disabled={locating}
      onClick={() => {
        setTaps((count) => count + 1);
        onLocate();
      }}
      className={cn(
        "absolute top-2.5 right-2.5 z-1 rounded-full max-md:top-34.5 md:top-auto md:bottom-20",
        (status === "located" || status === "approximate") && "text-primary",
      )}
    >
      {locating ? (
        <Loader2
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <LocateFixed aria-hidden="true" />
      )}
    </Button>
  );
}
