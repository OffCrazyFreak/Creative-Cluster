export const GEOCODE_ERROR_CODES = [
  "rate_limited",
  "auth",
  "unavailable",
  "bad_request",
  // Our own queue is full, not the provider: the chain moves on but the breaker stays closed.
  "busy",
] as const;
export type GeocodeErrorCode = (typeof GEOCODE_ERROR_CODES)[number];

export class GeocodeError extends Error {
  constructor(
    readonly code: GeocodeErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "GeocodeError";
  }
}

export function asGeocodeError(error: unknown): GeocodeError {
  if (error instanceof GeocodeError) return error;
  return new GeocodeError("unavailable", String(error));
}
