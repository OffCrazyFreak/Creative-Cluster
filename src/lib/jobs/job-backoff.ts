const BACKOFF_BASE_MS = 30_000;

export function backoffMs(attempts: number): number {
  return BACKOFF_BASE_MS * 4 ** Math.max(0, attempts - 1);
}
