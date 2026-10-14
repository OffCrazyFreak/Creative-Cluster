import { getContext } from "@netlify/functions";

// better-auth awaits sendResetPassword for real accounts but not for unknown addresses, so the
// mail work must leave the request or response timing reveals which addresses have an account.
export function runInBackground(task: Promise<unknown>) {
  const settled = task.catch((error: unknown) => {
    console.error("auth background task failed", error);
  });
  try {
    getContext().waitUntil(settled);
  } catch {
    // Outside a Netlify request (local dev, scripts) there is no context to wait on.
  }
}
