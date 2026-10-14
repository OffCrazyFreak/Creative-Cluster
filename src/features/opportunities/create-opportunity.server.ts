import { db } from "@/db/client.server";
import { opportunity, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { sourceLocaleOnSave } from "@/lib/translation/detect-locale";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
import { NotFoundError } from "@/server/errors";

import { afterOpportunityChange } from "./opportunity-effects.server";
import { periodEnd } from "./opportunity-expiry";
import { needsReview, newPostRefusal } from "./opportunity-limits.server";
import {
  checkValues,
  lockOwner,
  lockOwnEntry,
  normalizeTitle,
} from "./opportunity-rules.server";
import type {
  OpportunityInput,
  OpportunityResult,
} from "./opportunity-schemas";
import { insertTags } from "./opportunity-tags.server";

interface ICreateOpportunity {
  userId: string;
  values: OpportunityInput;
}

// A post always goes to the listing the owner area shows (the owner's newest one). The owner row is
// locked first, so two quick posts cannot both pass the limits, even across entries.
export async function createOpportunity({
  userId,
  values,
}: ICreateOpportunity): Promise<OpportunityResult> {
  const result = await db.transaction(
    async (tx): Promise<OpportunityResult> => {
      const now = new Date();
      await lockOwner(tx, userId);
      const owned = await lockOwnEntry(tx, userId);
      if (!owned) throw new NotFoundError();
      if (owned.status !== "published")
        return { status: "refused", code: "entry_not_published" };

      const checked = await checkValues(tx, userId, values, now);
      if (checked.code) return { status: "refused", code: checked.code };
      const title = normalizeTitle(values.title);
      const code = await newPostRefusal(tx, {
        entryId: owned.id,
        userId,
        title,
      });
      if (code) return { status: "refused", code };

      const review = await needsReview(tx, owned.id, owned.trusted);
      const deadline = values.deadline || null;
      const [created] = await tx
        .insert(opportunity)
        .values({
          entryId: owned.id,
          type: values.type,
          category: values.category,
          title,
          body: values.body.doc,
          bodyText: values.body.text,
          sourceLocale: sourceLocaleOnSave(
            `${title}\n${values.body.text}`,
            values.sourceLocale,
          ),
          remoteOk: values.remoteOk,
          deadline,
          expiresAt: periodEnd({ start: now, deadline }),
          status: review ? "pending" : "published",
          publishedAt: review ? null : now,
        })
        .returning({ id: opportunity.id });
      await insertTags(tx, created.id, values.tagIds);
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
        payload: { entryId: owned.id, submittedBy: userId },
      });
      return { status: "pending_review" };
    },
  );
  if (result.status === "published") await afterOpportunityChange();
  return result;
}
