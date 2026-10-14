import { dequal } from "dequal";
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, opportunity, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
import { NotFoundError } from "@/server/errors";

import { openOpportunityCondition } from "./opportunity-conditions.server";
import { afterOpportunityChange } from "./opportunity-effects.server";
import { deadlineEnd } from "./opportunity-expiry";
import { checkValues, normalizeTitle } from "./opportunity-rules.server";
import type {
  OpportunityInput,
  OpportunityResult,
} from "./opportunity-schemas";
import { currentTagSlugs, replaceTags } from "./opportunity-tags.server";

interface IUpdateOpportunity {
  id: string;
  userId: string;
  values: OpportunityInput;
}

const EDITABLE = ["pending", "published", "rejected"];

function pick(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

// Editing never extends a post: only a renewal does, so the renewal cap cannot be bypassed.
function nextExpiry(current: Date, deadline: string | null, now: Date) {
  if (!deadline || current <= now) return current;
  const end = deadlineEnd(deadline);
  return end < current ? end : current;
}

export async function updateOpportunity({
  id,
  userId,
  values,
}: IUpdateOpportunity): Promise<OpportunityResult> {
  const result = await db.transaction(
    async (tx): Promise<OpportunityResult> => {
      const now = new Date();
      const [current] = await tx
        .select({
          row: opportunity,
          entryStatus: entry.status,
        })
        .from(opportunity)
        .innerJoin(entry, eq(entry.id, opportunity.entryId))
        .where(
          and(
            eq(opportunity.id, id),
            eq(entry.ownerUserId, userId),
            sql`${entry.erasureRequestedAt} is null`,
          ),
        )
        .for("update", { of: opportunity });
      if (!current) throw new NotFoundError();
      const { row } = current;
      if (current.entryStatus !== "published")
        return { status: "refused", code: "entry_not_published" };
      if (!EDITABLE.includes(row.status))
        return { status: "refused", code: "not_editable" };

      const checked = await checkValues(tx, userId, values, now);
      if (checked.code) return { status: "refused", code: checked.code };
      const title = normalizeTitle(values.title);
      const [same] = await tx
        .select({ id: opportunity.id })
        .from(opportunity)
        .where(
          and(
            eq(opportunity.entryId, row.entryId),
            ne(opportunity.id, id),
            openOpportunityCondition(),
            sql`lower(${opportunity.title}) = lower(${title})`,
          ),
        )
        .limit(1);
      if (same) return { status: "refused", code: "duplicate" };

      const deadline = values.deadline || null;
      const resubmit = row.status === "rejected";
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
        ...(resubmit ? { status: "pending" as const } : {}),
      };
      const before = await currentTagSlugs(tx, id);
      const keys = (Object.keys(patch) as (keyof typeof patch)[]).filter(
        (key) => !dequal(row[key as keyof typeof row], patch[key]),
      );
      const tagsChanged = !dequal(before, checked.tagSlugs);
      if (keys.length === 0 && !tagsChanged) return { status: "saved" };

      await tx.update(opportunity).set(patch).where(eq(opportunity.id, id));
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
      const translate = ["title", "body", "sourceLocale"].some((key) =>
        keys.includes(key as never),
      );
      if (resubmit) {
        await tx.insert(reviewItem).values({
          type: "opportunity",
          entityType: "opportunity",
          entityId: id,
          payload: { entryId: row.entryId, submittedBy: userId },
        });
        return { status: "pending_review" };
      }
      if (translate && row.status === "published")
        await enqueueTranslation(tx, {
          entityType: "opportunity",
          entityId: id,
        });
      return { status: "saved" };
    },
  );
  if (result.status !== "refused") await afterOpportunityChange();
  return result;
}
