import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { link } from "@/db/schema";
import {
  SYMMETRIC_LINK_KINDS,
  type LinkKind,
  type LinkStatus,
} from "@/constants/links";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("admin_links") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { listAdminProposedLinks } = await import("./list-admin-links.server");

const none = { page: 1 } as const;

describe.skipIf(!temp)("admin proposed links list", () => {
  const { db } = temp as ITempDatabase;
  const ids = {} as Record<string, string>;
  let adminId = "";
  let otherAdminId = "";
  afterAll(async () => {
    await temp?.drop();
  });

  async function add(
    from: string,
    to: string,
    extra: {
      kind?: LinkKind;
      status?: LinkStatus;
      proposer?: string;
      proposedBy?: string;
      createdAt?: Date;
    } = {},
  ) {
    const kind = extra.kind ?? "collaborated";
    const symmetric = SYMMETRIC_LINK_KINDS.includes(kind);
    const [fromId, toId] = symmetric
      ? [ids[from], ids[to]].sort()
      : [ids[from], ids[to]];
    await db.insert(link).values({
      fromId,
      toId,
      kind,
      symmetric,
      status: extra.status ?? "proposed",
      proposedByEntryId: ids[extra.proposer ?? from],
      proposedBy: extra.proposedBy,
      createdAt: extra.createdAt,
    });
  }

  beforeAll(async () => {
    adminId = (await addUser(db, "Admin", "admin")).id;
    otherAdminId = (await addUser(db, "Other", "admin")).id;
    const owner = (await addUser(db, "Owner")).id;
    ids.owned = (
      await addEntry(db, "Owned Lab", {}, { ownerUserId: owner })
    ).id;
    ids.owned2 = (
      await addEntry(db, "Second Lab", {}, { ownerUserId: owner })
    ).id;
    ids.open = (await addEntry(db, "Open Studio")).id;
    ids.open2 = (await addEntry(db, "Open_Hub")).id;
    await add("owned", "open", { proposer: "owned", proposedBy: otherAdminId });
    await add("open", "owned2", {
      proposer: "owned2",
      kind: "supplier",
      proposedBy: adminId,
    });
    await add("owned", "owned2", {
      proposer: "owned",
      createdAt: new Date(Date.now() - 70 * 24 * 3600 * 1000),
    });
    await add("owned", "open2", { status: "confirmed", proposer: "owned" });
    await add("owned2", "open2", { status: "rejected", proposer: "owned2" });
  });

  it("lists only live proposals, oldest first, with the proposer and recipient resolved", async () => {
    const page = await listAdminProposedLinks(none, adminId);
    expect(page.total).toBe(2);
    expect(page.rows.map((row) => row.proposer.name)).toEqual([
      "Owned Lab",
      "Second Lab",
    ]);
    expect(page.rows[0].recipient.name).toBe("Open Studio");
    expect(page.rows[0].recipient.unclaimed).toBe(true);
  });

  it("lets an admin decide only for unclaimed recipients they did not propose", async () => {
    const mine = await listAdminProposedLinks(none, adminId);
    expect(mine.rows.map((row) => row.canDecide)).toEqual([true, false]);
    const theirs = await listAdminProposedLinks(none, otherAdminId);
    expect(theirs.rows.map((row) => row.canDecide)).toEqual([false, true]);
  });

  it("filters by kind, unclaimed recipient and listing name, matching % literally", async () => {
    const kind = await listAdminProposedLinks(
      { ...none, kind: "supplier" },
      adminId,
    );
    expect(kind.rows.map((row) => row.kind)).toEqual(["supplier"]);
    const unclaimed = await listAdminProposedLinks(
      { ...none, unclaimed: true },
      adminId,
    );
    expect(unclaimed.total).toBe(2);
    const named = await listAdminProposedLinks(
      { ...none, q: "second" },
      adminId,
    );
    expect(named.total).toBe(1);
    const wildcard = await listAdminProposedLinks({ ...none, q: "%" }, adminId);
    expect(wildcard.total).toBe(0);
  });

  it("counts the full match beyond the page", async () => {
    const empty = await listAdminProposedLinks({ page: 2 }, adminId);
    expect(empty.rows).toEqual([]);
    expect(empty.total).toBe(2);
  });
});
