import { sql } from "drizzle-orm";
import { isbot } from "isbot";

import { db } from "@/db/client.server";
import { entryViewDay } from "@/db/schema";

import { findPublicEntryId } from "./public-entry.server";

interface IViewContext {
  userAgent: string | undefined;
  purpose: string | undefined;
  viewerId: string | null;
}

// Prefetches (router preload, browser speculation) and crawlers are not visits; neither is the owner.
function isCountableVisit({ userAgent, purpose }: IViewContext) {
  if (!userAgent || isbot(userAgent)) return false;
  if (purpose && /prefetch|prerender/i.test(purpose)) return false;
  return true;
}

export async function recordEntryView(slug: string, context: IViewContext) {
  if (!isCountableVisit(context)) return;
  const target = await findPublicEntryId(slug);
  if (!target) return;
  if (context.viewerId && target.ownerUserId === context.viewerId) return;

  await db
    .insert(entryViewDay)
    .values({
      entryId: target.id,
      day: sql`(now() at time zone 'utc')::date`,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [entryViewDay.entryId, entryViewDay.day],
      set: { count: sql`${entryViewDay.count} + 1` },
    });
}
