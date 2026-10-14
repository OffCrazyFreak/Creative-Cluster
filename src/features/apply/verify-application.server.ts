import { eq } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

import { enterReviewQueue } from "./apply.server";
import type { VerifyApplicationResult } from "./apply-schemas";
import { entryIdForToken } from "./application-tokens.server";

export async function previewApplicationVerification(token: string) {
  const entryId = await entryIdForToken("apply-verify", token);
  if (!entryId) return null;
  const [row] = await db
    .select({ name: entry.name })
    .from(entry)
    .where(eq(entry.id, entryId))
    .limit(1);
  return row ? { entryName: row.name } : null;
}

// The token stays valid until it expires so a second click answers "already confirmed" instead of "invalid".
export async function verifyApplication(
  token: string,
): Promise<VerifyApplicationResult> {
  const entryId = await entryIdForToken("apply-verify", token);
  if (!entryId) return { status: "invalid" };

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(entry)
      .where(eq(entry.id, entryId))
      .limit(1)
      .for("update");
    if (!row?.contactEmail) return { status: "invalid" } as const;
    if (row.status !== "draft")
      return { status: "already", entryName: row.name } as const;

    await tx
      .update(entry)
      .set({ status: "pending" })
      .where(eq(entry.id, row.id));
    await writeChange(tx, {
      entityType: "entry",
      entityId: row.id,
      userId: null,
      source: "owner",
      action: "status_change",
      before: { status: "draft" },
      after: { status: "pending" },
    });
    await enterReviewQueue(
      tx,
      row.id,
      row.contactEmail,
      row.name,
      row.sourceLocale as AppLocale,
    );
    return { status: "verified", entryName: row.name } as const;
  });
}
