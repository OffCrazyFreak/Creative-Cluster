import { getContext } from "@netlify/functions";

// better-auth awaits sendResetPassword only for real accounts, so mail must leave the request or timing reveals who has an account.
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
