// A guard's UnauthorizedError arrives from a server function as a plain Error with the same name or message.
export function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "UnauthorizedError" || error.message === "Unauthorized")
  );
}
