import { and, eq } from "drizzle-orm";

import { REJECTED_EDIT_TTL_SECONDS } from "@/constants/apply";
import { LOCALES } from "@/constants/locales";
import type { ReasonCode } from "@/constants/moderation";
import { SILENT_REASON_CODES } from "@/constants/review";
import type { Tx } from "@/db/client.server";
import { entry, reviewItem } from "@/db/schema";
import { issueApplicationToken } from "@/features/apply/application-tokens.server";
import { pageLink } from "@/lib/auth/auth-email.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { NotFoundError } from "@/server/errors";
import { site } from "@/sites";

interface IRejectInput {
  itemId: string;
  entryId: string;
  adminId: string;
  reasonCode: ReasonCode;
  note: string | null;
}

// Spam gets no mail and no edit link; every other reason tells the applicant what to fix.
export async function rejectApplication(tx: Tx, input: IRejectInput) {
  const [row] = await tx
    .select()
    .from(entry)
    .where(and(eq(entry.id, input.entryId), eq(entry.status, "pending")))
    .limit(1)
    .for("update");
  if (!row) throw new NotFoundError();

  await tx
    .update(entry)
    .set({ status: "rejected" })
    .where(eq(entry.id, row.id));
  await tx
    .update(reviewItem)
    .set({
      status: "rejected",
      reasonCode: input.reasonCode,
      noteToApplicant: input.note,
      decidedBy: input.adminId,
      decidedAt: new Date(),
    })
    .where(eq(reviewItem.id, input.itemId));
  await writeChange(tx, {
    entityType: "entry",
    entityId: row.id,
    userId: input.adminId,
    source: "admin",
    action: "status_change",
    before: { status: "pending" },
    after: { status: "rejected" },
  });

  if (SILENT_REASON_CODES.includes(input.reasonCode) || !row.contactEmail)
    return;
  const locale = LOCALES.find((l) => l === row.sourceLocale) ?? site.baseLocale;
  const token = await issueApplicationToken(
    tx,
    "apply-edit",
    row.id,
    REJECTED_EDIT_TTL_SECONDS,
  );
  await enqueueEmail(tx, {
    template: "rejected",
    to: row.contactEmail,
    props: {
      locale,
      entryName: row.name,
      link: pageLink(`/apply?resubmit=${encodeURIComponent(token)}`, locale),
      reasonCode: input.reasonCode,
      note: input.note,
    },
    idempotencyKey: `rejected:${input.itemId}`,
  });
}
