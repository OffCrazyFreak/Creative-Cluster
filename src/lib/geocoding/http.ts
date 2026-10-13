import { GeocodeError } from "./errors";

export const GEOCODE_TIMEOUT_MS = 3000;

export type FetchLike = typeof fetch;

// Status codes map to the typed errors the chain reasons about; 403 is the ban signal the breaker watches.
export async function getJson(
  fetcher: FetchLike,
  url: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal } = {},
): Promise<unknown> {
  const timeout = AbortSignal.timeout(GEOCODE_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  let response: Response;
  try {
    response = await fetcher(url, { headers: init.headers, signal });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new GeocodeError("unavailable", `request failed: ${String(error)}`);
  }
  if (response.status === 429) throw new GeocodeError("rate_limited");
  if (response.status === 401 || response.status === 403)
    throw new GeocodeError("auth", String(response.status));
  if (response.status >= 400 && response.status < 500)
    throw new GeocodeError("bad_request", String(response.status));
  if (!response.ok)
    throw new GeocodeError("unavailable", String(response.status));
  try {
    return await response.json();
  } catch {
    throw new GeocodeError("unavailable", "invalid JSON");
  }
}
