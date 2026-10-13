// Only same-site paths: "//host" and "/\host" would send the user to another origin after login.
export function safeRedirect(target: string | undefined): string | null {
  if (!target?.startsWith("/")) return null;
  if (target.startsWith("//") || target.includes("\\")) return null;
  return target;
}
