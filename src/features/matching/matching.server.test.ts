import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { addEntry, addTag } from "../../../tests/helpers/fixture-data";
import {
  createTempDatabase,
  type ITempDatabase,
} from "../../../tests/helpers/temp-database";
import { findCollaborators } from "./matching.server";

const temp = await createTempDatabase("matching");

describe.skipIf(!temp)("findCollaborators", () => {
  const { db } = temp as ITempDatabase;
  const ids: Record<string, string> = {};
  async function cards(name: string) {
    return (await findCollaborators(db, ids[name])).cards.map((c) => c.name);
  }

  beforeAll(async () => {
    async function tag(slug: string, extra = {}) {
      return (await addTag(db, slug, extra)).id;
    }
    const printing = await tag("3d-printing");
    const grants = await tag("grant-writing");
    const topic = await tag("robotics");
    const everyone = await tag("networking");
    const hidden = await tag("hidden-suggestion", { status: "suggested" });

    const entries = {
      me: await addEntry(db, "Me", {
        offering: [printing],
        seeking: [grants, hidden],
        topic: [topic],
      }),
      mutual: await addEntry(db, "Mutual", {
        offering: [grants],
        seeking: [printing],
        topic: [topic],
      }),
      oneWay: await addEntry(db, "One way", { offering: [grants] }),
      optedOut: await addEntry(
        db,
        "Opted out",
        { offering: [grants] },
        { matchingOptOut: true },
      ),
      draft: await addEntry(
        db,
        "Draft",
        { offering: [grants] },
        { status: "draft" },
      ),
      linked: await addEntry(db, "Linked", { offering: [grants] }),
      proposed: await addEntry(db, "Proposed", { offering: [grants] }),
      hiddenOnly: await addEntry(db, "Hidden only", { offering: [hidden] }),
      topicOnly: await addEntry(db, "Topic only", { topic: [topic] }),
      lonely: await addEntry(db, "Lonely", { topic: [topic] }),
      commonSeeker: await addEntry(db, "Common seeker", {
        seeking: [everyone],
      }),
    };
    for (const [key, row] of Object.entries(entries)) ids[key] = row.id;

    for (let i = 0; i < 20; i += 1) {
      await addEntry(db, `Filler ${i}`, { offering: [everyone] });
    }
    const [from, to] = [ids.me, ids.linked].sort();
    await db.insert(schema.link).values([
      {
        fromId: from,
        toId: to,
        kind: "collaborated",
        symmetric: true,
        status: "confirmed",
      },
    ]);
    const [pFrom, pTo] = [ids.me, ids.proposed].sort();
    await db.insert(schema.link).values([
      {
        fromId: pFrom,
        toId: pTo,
        kind: "collaborated",
        symmetric: true,
        status: "proposed",
      },
    ]);
  });

  afterAll(async () => {
    await temp?.drop();
  });

  it("ranks the mutual match first and labels it strong", async () => {
    const { mode, cards } = await findCollaborators(db, ids.me);
    expect(mode).toBe("collaborate");
    expect(cards[0]).toMatchObject({ name: "Mutual", strength: "strong" });
    expect(cards[0].reasons.map((r) => [r.relation, r.tags[0].slug])).toEqual([
      ["offers", "grant-writing"],
      ["seeks", "3d-printing"],
    ]);
  });

  it("labels a one-way match possible", async () => {
    const result = (await findCollaborators(db, ids.me)).cards;
    const oneWay = result.find((c) => c.name === "One way");
    expect(oneWay?.strength).toBe("possible");
    expect(oneWay?.reasons).toHaveLength(1);
  });

  it("excludes opted-out, unpublished, confirmed-link and unapproved-tag entries", async () => {
    const names = await cards("me");
    expect(names).not.toContain("Opted out");
    expect(names).not.toContain("Draft");
    expect(names).not.toContain("Linked");
    expect(names).not.toContain("Hidden only");
    expect(names).not.toContain("Me");
    expect(names.length).toBeLessThanOrEqual(3);
  });

  it("keeps entries whose link is only proposed", async () => {
    expect(await cards("me")).toContain("Proposed");
  });

  it("drops matches that rest on a tag nearly everyone has", async () => {
    expect(await cards("commonSeeker")).toEqual([]);
  });

  it("falls back to similar entries by topic when there are no offering or seeking tags", async () => {
    const result = await findCollaborators(db, ids.lonely);
    expect(result.mode).toBe("similar");
    expect(result.cards.map((c) => c.name).sort()).toEqual([
      "Me",
      "Mutual",
      "Topic only",
    ]);
    expect(result.cards.every((c) => c.strength === null)).toBe(true);
  });

  it("returns nothing for an entry that opted out", async () => {
    expect(await cards("optedOut")).toEqual([]);
  });
});
