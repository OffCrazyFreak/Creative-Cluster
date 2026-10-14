import { useEffect } from "react";

interface IMapFailureReporterProps {
  onFailed: () => void;
}

// Rendered as the error fallback: MapLibre threw (for example no WebGL context), so hand over to the list.
export default function MapFailureReporter({
  onFailed,
}: IMapFailureReporterProps) {
  useEffect(() => {
    onFailed();
  }, [onFailed]);
  return null;
}
