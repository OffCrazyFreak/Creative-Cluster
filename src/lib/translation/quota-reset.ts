const RETRY_MS = 60 * 60 * 1000;

// The free allocation resets at 00:00 UTC per the docs, but users report resets hours late, so retry hourly; a refused call runs no model, so it uses no tokens.
export function nextQuotaRetry(now: Date): Date {
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 5),
  );
  if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1);
  return new Date(Math.min(reset.getTime(), now.getTime() + RETRY_MS));
}
