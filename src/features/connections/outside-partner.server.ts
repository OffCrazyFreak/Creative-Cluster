import { and, eq, or, sql } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import { entry, link } from "@/db/schema";
import { allocateSlug } from "@/features/entry/slug.server";
import { writeChange } from "@/lib/change-log/write-change.server";

interface IOutsidePartnerInput {
  name: string;
  website: string;
}

// Stubs are never published. The proposer's repeated partner reuses its stub so one name does not
// pile up duplicates, because no moderator sees these before they show on the proposer's page.
export async function findOrCreateOutsidePartner(
  tx: Tx,
  proposerEntryId: string,
  input: IOutsidePartnerInput,
  sourceLocale: "en" | "hr",
  userId: string,
): Promise<string> {
  const [existing] = await tx
    .select({ id: entry.id, website: entry.website })
    .from(entry)
    .innerJoin(link, or(eq(link.fromId, entry.id), eq(link.toId, entry.id)))
    .where(
      and(
        eq(entry.kind, "outside_partner"),
        sql`lower(${entry.name}) = lower(${input.name})`,
        eq(link.proposedByEntryId, proposerEntryId),
      ),
    )
    .limit(1);
  // The proposer's latest website wins, otherwise a mistyped URL could never be corrected.
  if (existing && existing.website !== input.website) {
    await tx
      .update(entry)
      .set({ website: input.website })
      .where(eq(entry.id, existing.id));
    await writeChange(tx, {
      entityType: "entry",
      entityId: existing.id,
      userId,
      source: "owner",
      action: "update",
      before: { website: existing.website },
      after: { website: input.website },
    });
  }
  if (existing) return existing.id;

  const [row] = await tx
    .insert(entry)
    .values({
      slug: await allocateSlug(tx, input.name),
      kind: "outside_partner",
      status: "draft",
      name: input.name,
      website: input.website,
      sourceLocale,
    })
    .returning({ id: entry.id });
  await writeChange(tx, {
    entityType: "entry",
    entityId: row.id,
    userId,
    source: "owner",
    action: "create",
    after: { kind: "outside_partner", name: input.name },
  });
  return row.id;
}
