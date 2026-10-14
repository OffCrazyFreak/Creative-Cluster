import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { entry, link } from "@/db/schema";
import { eq } from "drizzle-orm";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

vi.mock("@/db/client.server", async () => {
  const { createTempDatabase } =
    await import("../../../tests/helpers/temp-database");
  const temp = await createTempDatabase("connections");
  return { db: temp?.db, temp };
});
vi.mock("@/lib/limits/check-limit.server", () => ({
  enforceLimits: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/auth/auth-email.server", () => ({
  pageLink: (path: string) => `https://example.test${path}`,
}));

const client = (await import("@/db/client.server")) as unknown as {
  db: ITempDatabase["db"] | undefined;
  temp: ITempDatabase | null;
};
const { proposeLink } = await import("./propose-link.server");
const { decideLink, withdrawLink } = await import("./decide-link.server");
const { listMyConnections, countPendingProposals } =
  await import("./list-links.server");
const { loadPublicConnections } = await import("./public-connections.server");
const { withdrawStaleProposals } = await import("./expire-links.server");
const { enforceLimits } = await import("@/lib/limits/check-limit.server");

describe.skipIf(!client.temp)("connections flow", () => {
  const db = client.db as ITempDatabase["db"];
  const ids = {} as Record<string, string>;
  const users = {} as Record<string, string>;
  const base = {
    kind: "collaborated" as const,
    direction: "outgoing" as const,
    year: null,
    endYear: null,
    project: null,
    note: null,
    evidenceUrl: null,
  };
  function propose(from: string, to: string, extra = {}) {
    return proposeLink(
      {
        ...base,
        fromEntryId: ids[from],
        target: { type: "entry", entryId: ids[to] },
        ...extra,
      },
      users[from],
    );
  }

  beforeAll(async () => {
    for (const name of ["a", "b", "c"]) {
      users[name] = (await addUser(db, name)).id;
      ids[name] = (
        await addEntry(db, name, {}, { ownerUserId: users[name] })
      ).id;
    }
    ids.unclaimed = (await addEntry(db, "unclaimed")).id;
    ids.hidden = (await addEntry(db, "hidden", {}, { status: "suspended" })).id;
  });
  afterAll(async () => client.temp?.drop());

  it("stores a symmetric link with the smaller id first and lets only the other owner confirm", async () => {
    const result = await propose("b", "a");
    expect(result.ok).toBe(true);
    const [row] = await db.select().from(link);
    expect(row.fromId < row.toId).toBe(true);
    expect(row.proposedByEntryId).toBe(ids.b);
    expect(await countPendingProposals(users.a)).toBe(1);
    expect(await countPendingProposals(users.b)).toBe(0);

    const confirm = { linkId: row.id, decision: "confirm" as const };
    const asProposer = { userId: users.b, admin: false };
    await expect(decideLink(confirm, asProposer)).rejects.toThrow("Not found");
    await expect(
      decideLink(confirm, { userId: users.c, admin: false }),
    ).rejects.toThrow("Not found");
    await decideLink(confirm, { userId: users.a, admin: false });
    const [after] = await db.select().from(link).where(eq(link.id, row.id));
    expect(after.status).toBe("confirmed");
    expect(after.decidedBy).toBe(users.a);
  });

  it("refuses a duplicate and an unavailable target", async () => {
    expect(await propose("a", "b")).toEqual({ ok: false, error: "exists" });
    expect(await propose("a", "hidden")).toEqual({
      ok: false,
      error: "target_unavailable",
    });
  });

  it("blocks the same kind for 30 days after a rejection but allows another kind", async () => {
    const first = await propose("c", "a", { kind: "eu_partner" });
    if (!first.ok) throw new Error("proposal failed");
    await decideLink(
      { linkId: first.linkId, decision: "reject" },
      { userId: users.a, admin: false },
    );
    expect(await propose("c", "a", { kind: "eu_partner" })).toEqual({
      ok: false,
      error: "cooldown",
    });
    expect((await propose("c", "a", { kind: "mentor" })).ok).toBe(true);
  });

  it("lets either side withdraw and writes a change row", async () => {
    const [row] = await db.select().from(link).where(eq(link.kind, "mentor"));
    await expect(withdrawLink(row.id, users.b)).rejects.toThrow("Not found");
    await withdrawLink(row.id, users.a);
    const mine = await listMyConnections(users.c);
    expect(mine.items.find((item) => item.id === row.id)).toBeUndefined();
  });

  it("waits on an unclaimed target and lets an admin decide for it", async () => {
    const result = await propose("a", "unclaimed", { kind: "supplier" });
    if (!result.ok) throw new Error("proposal failed");
    await expect(
      decideLink(
        { linkId: result.linkId, decision: "confirm" },
        { userId: users.b, admin: false },
      ),
    ).rejects.toThrow("Not found");
    const admin = (await addUser(db, "admin", "admin")).id;
    await decideLink(
      { linkId: result.linkId, decision: "confirm" },
      { userId: admin, admin: true },
    );
    const [row] = await db
      .select()
      .from(link)
      .where(eq(link.id, result.linkId));
    expect(row.decidedBy).toBe(admin);
  });

  it("confirms an outside partner at once, with evidence required", async () => {
    const outside = {
      type: "outside" as const,
      name: "Studio Elsewhere",
      website: "https://elsewhere.example",
    };
    const result = await propose("a", "b", {
      target: outside,
      kind: "member_of",
      evidenceUrl: "https://elsewhere.example/members",
    });
    expect(result.ok).toBe(true);
    const mine = await listMyConnections(users.a);
    const item = mine.items.find((i) => i.other.kind === "outside_partner");
    expect(item?.status).toBe("confirmed");
    expect(item?.evidence).toEqual(["https://elsewhere.example/members"]);
  });

  it("withdraws proposals older than 60 days", async () => {
    const result = await propose("b", "c", { kind: "supplier" });
    if (!result.ok) throw new Error("proposal failed");
    await db
      .update(link)
      .set({ createdAt: new Date(Date.now() - 61 * 86_400_000) })
      .where(eq(link.id, result.linkId));
    expect(await countPendingProposals(users.c)).toBe(0);
    expect(await withdrawStaleProposals(db)).toBe(1);
  });

  it("treats the two directions of a directed kind as separate links", async () => {
    expect((await propose("a", "b", { kind: "mentor" })).ok).toBe(true);
    expect((await propose("b", "a", { kind: "mentor" })).ok).toBe(true);
    expect(await propose("b", "a", { kind: "mentor" })).toEqual({
      ok: false,
      error: "exists",
    });
  });

  it("does not let an admin confirm their own proposal to an unclaimed listing", async () => {
    const result = await propose("c", "unclaimed", { kind: "mentor" });
    if (!result.ok) throw new Error("proposal failed");
    await expect(
      decideLink(
        { linkId: result.linkId, decision: "confirm" },
        { userId: users.c, admin: true },
      ),
    ).rejects.toThrow("Not found");
  });

  it("reuses one stub for the same outside partner", async () => {
    const outside = {
      type: "outside" as const,
      name: "studio elsewhere",
      website: "https://elsewhere.example",
    };
    const result = await propose("a", "b", {
      target: outside,
      kind: "supplier",
      evidenceUrl: "https://elsewhere.example/supply",
    });
    expect(result.ok).toBe(true);
    const stubs = await db
      .select()
      .from(entry)
      .where(eq(entry.kind, "outside_partner"));
    expect(stubs).toHaveLength(1);
  });

  it("shows a link on the owner's side even when their own entry is suspended", async () => {
    const owner = (await addUser(db, "suspended-owner")).id;
    const mine = await addEntry(
      db,
      "suspended mine",
      {},
      { ownerUserId: owner, status: "suspended" },
    );
    const [lo, hi] = [mine.id, ids.a].sort();
    await db.insert(link).values({
      fromId: lo,
      toId: hi,
      kind: "collaborated",
      symmetric: true,
      status: "confirmed",
    });
    const { items } = await listMyConnections(owner);
    expect(items).toHaveLength(1);
    expect(items[0].self.id).toBe(mine.id);
    expect(items[0].other.id).toBe(ids.a);
  });

  it("reports the daily limit", async () => {
    vi.mocked(enforceLimits).mockRejectedValueOnce(
      new (await import("@/server/errors")).LimitError(),
    );
    expect(await propose("b", "c", { kind: "mentor" })).toEqual({
      ok: false,
      error: "limit",
    });
  });

  describe("public connections", () => {
    const db = client.db as ITempDatabase["db"];

    async function link2(
      a: string,
      b: string,
      status: "proposed" | "confirmed" | "withdrawn",
      kind: "collaborated" | "eu_partner" = "collaborated",
    ) {
      const [fromId, toId] = [a, b].sort();
      await db.insert(link).values({
        fromId,
        toId,
        kind,
        symmetric: true,
        status,
        decidedAt: status === "confirmed" ? new Date() : null,
      });
    }

    it("shows confirmed links to public entries only", async () => {
      const hub = (await addEntry(db, "pub hub")).id;
      const shown = (await addEntry(db, "pub shown")).id;
      const proposed = (await addEntry(db, "pub proposed")).id;
      const withdrawn = (await addEntry(db, "pub withdrawn")).id;
      const suspended = (
        await addEntry(db, "pub suspended", {}, { status: "suspended" })
      ).id;
      const archived = (
        await addEntry(db, "pub archived", {}, { status: "archived" })
      ).id;
      await link2(hub, shown, "confirmed");
      await link2(hub, proposed, "proposed");
      await link2(hub, withdrawn, "withdrawn");
      await link2(hub, suspended, "confirmed");
      await link2(hub, archived, "confirmed");

      const result = await loadPublicConnections(hub);
      expect(result.partners.map((p) => p.name)).toEqual(["pub shown"]);
    });

    it("shows an outside partner only on the proposer's page", async () => {
      const proposer = (await addEntry(db, "pub proposer")).id;
      const other = (await addEntry(db, "pub other")).id;
      const [stub] = await db
        .insert(entry)
        .values({
          slug: "pub-stub",
          kind: "outside_partner",
          status: "draft",
          name: "Pub Stub",
          sourceLocale: "en",
        })
        .returning();
      await db.insert(link).values({
        fromId: proposer,
        toId: stub.id,
        kind: "member_of",
        symmetric: false,
        status: "confirmed",
        proposedByEntryId: proposer,
      });
      const mine = await loadPublicConnections(proposer);
      expect(mine.unverified.map((p) => p.name)).toEqual(["Pub Stub"]);
      expect(mine.partners).toEqual([]);
      expect((await loadPublicConnections(other)).unverified).toEqual([]);
    });

    it("returns nothing for an entry that is not public", async () => {
      const hidden = (await addEntry(db, "pub hidden", {}, { status: "draft" }))
        .id;
      const friend = (await addEntry(db, "pub friend")).id;
      await link2(hidden, friend, "confirmed");
      expect(await loadPublicConnections(hidden)).toEqual({
        partners: [],
        unverified: [],
      });
    });
  });
});
