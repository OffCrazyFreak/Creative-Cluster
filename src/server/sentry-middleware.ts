import { createMiddleware } from "@tanstack/react-start";

// Imported lazily inside the server callbacks so the Sentry browser SDK never lands in the main client bundle.
async function report(error: unknown, mechanism: string): Promise<void> {
  // Redirects and not-found results travel as thrown control flow, not failures.
  if (error instanceof Response) return;
  if (
    typeof error === "object" &&
    error !== null &&
    ("isRedirect" in error || "isNotFound" in error)
  ) {
    return;
  }
  const { captureException } = await import("@sentry/tanstackstart-react");
  captureException(error, { mechanism: { type: mechanism, handled: false } });
}

export const sentryRequestMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    await report(error, "auto.middleware.tanstackstart.request");
    throw error;
  }
});

export const sentryFunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    await report(error, "auto.middleware.tanstackstart.function");
    throw error;
  }
});
