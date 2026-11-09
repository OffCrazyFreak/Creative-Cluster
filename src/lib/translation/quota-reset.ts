const RETRY_MS = 60 * 60 * 1000;

// The docs say 00:00 UTC but users report late resets, so retry hourly; a refused call uses no tokens.
export function nextQuotaRetry(now: Date): Date {
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 5),
  );
  if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1);
  return new Date(Math.min(reset.getTime(), now.getTime() + RETRY_MS));
}
