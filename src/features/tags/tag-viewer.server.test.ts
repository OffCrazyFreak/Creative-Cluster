import { describe, expect, it, vi } from "vitest";

const fresh = vi.hoisted(() => ({
  session: null as null | { user: { role: string; banned: boolean } },
}));
vi.mock("@/server/session.server", () => ({
  readSession: () => Promise.resolve(fresh.session),
}));
const { tagViewer } = await import("./tag-viewer.server");

describe("tag viewer", () => {
  const cachedAdmin = { user: { id: "u1", role: "admin" } };

  it("drops a cached admin role the database no longer has", async () => {
    fresh.session = { user: { role: "member", banned: false } };
    expect(await tagViewer(cachedAdmin)).toEqual({
      userId: "u1",
      isAdmin: false,
    });
  });

  it("keeps a confirmed admin and never asks for members or visitors", async () => {
    fresh.session = { user: { role: "admin", banned: false } };
    expect(await tagViewer(cachedAdmin)).toEqual({
      userId: "u1",
      isAdmin: true,
    });
    expect(await tagViewer({ user: { id: "u2", role: "member" } })).toEqual({
      userId: "u2",
      isAdmin: false,
    });
    expect(await tagViewer(null)).toEqual({ userId: null, isAdmin: false });
  });
});
