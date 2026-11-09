export type ShareOutcome = "shared" | "dismissed" | "copied" | "failed";

interface IShareData {
  title: string;
  url: string;
}

// A second share while one is open raises InvalidStateError; falling through would copy behind the user's back.
function isDismissal(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "InvalidStateError")
  );
}

// No pending state, because navigator.share does not reliably settle when the sheet is dismissed on mobile.
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
