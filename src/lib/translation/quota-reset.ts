// The Workers AI free allocation resets at 00:00 UTC; five minutes later is safely after it.
export function nextQuotaReset(now: Date): Date {
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 5),
  );
  if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1);
  return reset;
}
