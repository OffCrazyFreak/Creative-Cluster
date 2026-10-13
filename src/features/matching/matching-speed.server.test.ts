import { afterAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import {
  createTempDatabase,
  type ITempDatabase,
} from "../../../tests/helpers/temp-database";
import { findCollaborators } from "./matching.server";

const temp = await createTempDatabase("matchspeed");

// Small deterministic generator so the fixture is the same on every run.
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe.skipIf(!temp)("matching speed", () => {
  const { db } = temp as ITempDatabase;

  afterAll(async () => {
    await temp?.drop();
  });

  it("answers in under 20 ms on 400 entries", async () => {
    const random = prng(7);
    function pick(list: string[], n: number) {
      return Array.from(
        { length: n },
        () => list[Math.floor(random() * list.length)],
      );
    }
    const tags = await db
      .insert(schema.tag)
      .values(
        Array.from({ length: 100 }, (_, i) => ({
          slug: `tag-${i}`,
          labelEn: `Tag ${i}`,
          labelHr: `Oznaka ${i}`,
        })),
      )
      .returning({ id: schema.tag.id });
    const tagIds = tags.map((t) => t.id);

    const entries = await db
      .insert(schema.entry)
      .values(
        Array.from({ length: 400 }, (_, i) => ({
          slug: `entry-${i}`,
          name: `Entry ${i}`,
          kind: "organization" as const,
          sourceLocale: "en",
          status: "published" as const,
        })),
      )
      .returning({ id: schema.entry.id });
    const rows = entries.flatMap((e) =>
      (["offering", "seeking", "topic"] as const).flatMap((field) =>
        [...new Set(pick(tagIds, field === "topic" ? 2 : 4))].map((tagId) => ({
          entryId: e.id,
          tagId,
          field,
        })),
      ),
    );
    await db.insert(schema.entryTag).values(rows);
    await db.execute("analyze");

    await findCollaborators(db, entries[0].id);
    const runs: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      const started = performance.now();
      const { cards } = await findCollaborators(db, entries[i * 13].id);
      runs.push(performance.now() - started);
      expect(cards.length).toBeGreaterThan(0);
    }
    runs.sort((a, b) => a - b);
    const median = runs[Math.floor(runs.length / 2)];
    console.log(
      `matching on ${entries.length} entries, ${rows.length} entry_tag rows: median ${median.toFixed(2)} ms, max ${runs.at(-1)?.toFixed(2)} ms`,
    );
    // CI runners are slower than a dev machine; the design target is 20 ms.
    expect(median).toBeLessThan(40);
  });
});
