import { and, count, eq, gt, sql } from "drizzle-orm";

import { OPPORTUNITY_LIMITS as L } from "@/constants/opportunities";
import { db, type Tx } from "@/db/client.server";
import { entry, opportunity, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
import { NotFoundError } from "@/server/errors";

import { openOpportunityCondition } from "./opportunity-conditions.server";
import { afterOpportunityChange } from "./opportunity-effects.server";
import { periodEnd } from "./opportunity-expiry";
import {
  checkValues,
  normalizeTitle,
  ownedEntry,
} from "./opportunity-rules.server";
import type {
  OpportunityInput,
  OpportunityResult,
} from "./opportunity-schemas";
import { replaceTags } from "./opportunity-tags.server";

interface ICreateOpportunity {
  entryId: string;
  userId: string;
  values: OpportunityInput;
}

async function needsReview(tx: Tx, entryId: string, trusted: boolean) {
  // The admin can force review for one entry; otherwise only an entry with no approved post yet.
  if (!trusted) return true;
  const [approved] = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.entryId, entryId),
        sql`${opportunity.publishedAt} is not null`,
      ),
    )
    .limit(1);
  return !approved;
}

async function refusal(
  tx: Tx,
  { entryId, userId }: ICreateOpportunity,
  title: string,
) {
  const [{ open }] = await tx
    .select({ open: count() })
    .from(opportunity)
    .where(and(eq(opportunity.entryId, entryId), openOpportunityCondition()));
  if (open >= L.activePerEntry) return "limit_active" as const;

  const [{ recent }] = await tx
    .select({ recent: count() })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(
      and(
        eq(entry.ownerUserId, userId),
        gt(opportunity.createdAt, sql`now() - interval '1 day'`),
      ),
    );
  if (recent >= L.newPerOwnerPerDay) return "limit_daily" as const;

  const [same] = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.entryId, entryId),
        openOpportunityCondition(),
        sql`lower(${opportunity.title}) = lower(${title})`,
      ),
    )
    .limit(1);
  return same ? ("duplicate" as const) : null;
}

// The entry row is locked for the whole check, so two quick posts cannot both pass the caps.
export async function createOpportunity(
  input: ICreateOpportunity,
): Promise<OpportunityResult> {
  const { entryId, userId, values } = input;
  const result = await db.transaction(
    async (tx): Promise<OpportunityResult> => {
      const now = new Date();
      const [owned] = await tx
        .select({ status: entry.status, trusted: entry.trusted })
        .from(entry)
        .where(ownedEntry(entryId, userId))
        .for("update");
      if (!owned) throw new NotFoundError();
      if (owned.status !== "published")
        return { status: "refused", code: "entry_not_published" };

      const checked = await checkValues(tx, userId, values, now);
      if (checked.code) return { status: "refused", code: checked.code };
      const title = normalizeTitle(values.title);
      const code = await refusal(tx, input, title);
      if (code) return { status: "refused", code };

      const review = await needsReview(tx, entryId, owned.trusted);
      const deadline = values.deadline || null;
      const [created] = await tx
        .insert(opportunity)
        .values({
          entryId,
          type: values.type,
          category: values.category,
          title,
          body: values.body.doc,
          bodyText: values.body.text,
          sourceLocale: values.sourceLocale,
          remoteOk: values.remoteOk,
          deadline,
          expiresAt: periodEnd({ start: now, deadline }),
          status: review ? "pending" : "published",
          publishedAt: review ? null : now,
        })
        .returning({ id: opportunity.id });
      await replaceTags(tx, created.id, values.tagIds);
      await writeChange(tx, {
        entityType: "opportunity",
        entityId: created.id,
        userId,
        source: "owner",
        action: "create",
        after: {
          title,
          type: values.type,
          category: values.category,
          deadline,
          tags: checked.tagSlugs,
          status: review ? "pending" : "published",
        },
      });
      if (!review) {
        await enqueueTranslation(tx, {
          entityType: "opportunity",
          entityId: created.id,
        });
        return { status: "published" };
      }
      await tx.insert(reviewItem).values({
        type: "opportunity",
        entityType: "opportunity",
        entityId: created.id,
        payload: { entryId, submittedBy: userId },
      });
      return { status: "pending_review" };
    },
  );
  if (result.status === "published") await afterOpportunityChange();
  return result;
}
