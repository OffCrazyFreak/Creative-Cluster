export type ShareOutcome = "shared" | "dismissed" | "copied" | "failed";

interface IShareData {
  title: string;
  url: string;
}

// AbortError is the user closing the sheet. InvalidStateError is a second share fired while one
// is still open: falling through to the clipboard there would copy behind the user's back.
function isDismissal(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "InvalidStateError")
  );
}

// Returns the outcome rather than showing a toast, so callers keep their own wording. No pending
// state: navigator.share does not reliably settle when the sheet is dismissed on mobile.
export async function shareOrCopy(data: IShareData): Promise<ShareOutcome> {
  if (typeof navigator === "undefined") return "failed";
  if (navigator.share) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if (isDismissal(error)) return "dismissed";
    }
  }
  try {
    await navigator.clipboard.writeText(data.url);
    return "copied";
  } catch {
    return "failed";
  }
}
