import { readSession } from "@/server/session.server";

interface ICachedSession {
  user: { id: string; role?: string | null };
}

// publicGuard's session can be 60 seconds old, so a cached admin role is confirmed against the database before showing suggested tags.
export async function tagViewer(session: ICachedSession | null) {
  const current =
    session?.user.role === "admin" ? await readSession({ fresh: true }) : null;
  return {
    userId: session?.user.id ?? null,
    isAdmin: Boolean(
      current && !current.user.banned && current.user.role === "admin",
    ),
  };
}
