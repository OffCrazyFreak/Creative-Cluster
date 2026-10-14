// TanStack Form hands back strings or schema issues; both show as one message.
export function errorMessage(error: unknown): string | undefined {
  if (typeof error === "string") return error;
  return (error as { message?: string } | null | undefined)?.message;
}
