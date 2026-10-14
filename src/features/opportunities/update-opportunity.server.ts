import { dequal } from "dequal";
import { eq } from "drizzle-orm";

import {
  OPPORTUNITY_LIMITS as L,
  type OpportunityStatus,
} from "@/constants/opportunities";
import { db } from "@/db/client.server";
import { opportunity, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";

import { afterOpportunityChange } from "./opportunity-effects.server";
import { deadlineEnd } from "./opportunity-expiry";
import { countOpenPosts } from "./opportunity-limits.server";
import {
  checkValues,
  findDuplicateTitle,
  normalizeTitle,
} from "./opportunity-rules.server";
import type {
  OpportunityInput,
  OpportunityResult,
} from "./opportunity-schemas";
import { currentTagSlugs, replaceTags } from "./opportunity-tags.server";
import { lockOwnOpportunity } from "./own-opportunity-lock.server";

interface IUpdateOpportunity {
  id: string;
  userId: string;
  values: OpportunityInput;
}

const EDITABLE: readonly OpportunityStatus[] = [
  "pending",
  "published",
  "rejected",
];
const TRANSLATED_KEYS = ["title", "body", "sourceLocale"];
const REVIEWED_KEYS = ["title", "body"];

function pick(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

// Editing never extends a post: only a renewal does, so the renewal cap cannot be bypassed.
function nextExpiry(current: Date, deadline: string | null, now: Date) {
  if (!deadline || current <= now) return current;
  const end = deadlineEnd(deadline);
  return end < current ? end : current;
}

// Edits go live without review, except that a changed text on an entry the admin set to review
// takes the post offline until the admin has seen it again. A rejected post always returns to the queue.
export async function updateOpportunity({
  id,
  userId,
  values,
}: IUpdateOpportunity): Promise<OpportunityResult> {
  const result = await db.transaction(
    async (tx): Promise<OpportunityResult> => {
      const now = new Date();
      const { row, entryStatus, entryTrusted } = await lockOwnOpportunity(
        tx,
        id,
        userId,
      );
      if (entryStatus !== "published")
        return { status: "refused", code: "entry_not_published" };
      if (!EDITABLE.includes(row.status))
        return { status: "refused", code: "not_editable" };

      // A deadline that is already over is only a problem when the owner sets it, not when it is left alone.
      const checked = await checkValues(tx, userId, values, now, row.deadline);
      if (checked.code) return { status: "refused", code: checked.code };
      const title = normalizeTitle(values.title);
      if (await findDuplicateTitle(tx, row.entryId, title, id))
        return { status: "refused", code: "duplicate" };

      const deadline = values.deadline || null;
      const patch = {
        type: values.type,
        category: values.category,
        title,
        body: values.body.doc,
        bodyText: values.body.text,
        sourceLocale: values.sourceLocale,
        remoteOk: values.remoteOk,
        deadline,
        expiresAt: nextExpiry(row.expiresAt, deadline, now),
      };
      const before = await currentTagSlugs(tx, id);
      const keys = (Object.keys(patch) as (keyof typeof patch)[]).filter(
        (key) => !dequal(row[key], patch[key]),
      );
      const tagsChanged = !dequal(before, checked.tagSlugs);
      const resubmit = row.status === "rejected";
      if (keys.length === 0 && !tagsChanged && !resubmit)
        return { status: "unchanged" };

      const reviewAgain =
        resubmit ||
        (row.status === "published" &&
          !entryTrusted &&
          keys.some((key) => REVIEWED_KEYS.includes(key)));
      if (
        resubmit &&
        (await countOpenPosts(tx, row.entryId, id)) >= L.activePerEntry
      )
        return { status: "refused", code: "limit_active" };

      await tx
        .update(opportunity)
        .set({ ...patch, ...(reviewAgain ? { status: "pending" } : {}) })
        .where(eq(opportunity.id, id));
      await replaceTags(tx, id, values.tagIds);
      await writeChange(tx, {
        entityType: "opportunity",
        entityId: id,
        userId,
        source: "owner",
        action: "update",
        before: {
          ...pick(row, keys),
          ...(tagsChanged ? { tags: before } : {}),
        },
        after: {
          ...pick(patch, keys),
          ...(tagsChanged ? { tags: checked.tagSlugs } : {}),
        },
      });
      if (reviewAgain) {
        await tx.insert(reviewItem).values({
          type: "opportunity",
          entityType: "opportunity",
          entityId: id,
          payload: { entryId: row.entryId, submittedBy: userId },
        });
        return { status: "pending_review" };
      }
      if (
        row.status === "published" &&
        keys.some((key) => TRANSLATED_KEYS.includes(key))
      )
        await enqueueTranslation(tx, {
          entityType: "opportunity",
          entityId: id,
        });
      return { status: "saved" };
    },
  );
  if (result.status === "saved" || result.status === "pending_review")
    await afterOpportunityChange();
  return result;
}
