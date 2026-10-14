import { and, eq, gt, inArray, or } from "drizzle-orm";

import { LINK_LIMITS } from "@/constants/links";
import type { Tx } from "@/db/client.server";
import { link } from "@/db/schema";

import type { LinkKind } from "@/constants/links";
import { daysAgo } from "./link-conditions.server";
import type { IOrientedLink } from "./orient-link";
import { ProposeRefused } from "./propose-refused";

// Only the exact stored pair counts: directed kinds are separate relationships per direction,
// and symmetric kinds are already normalised by orientLink.
export async function assertLinkFree(
  tx: Tx,
  kind: LinkKind,
  oriented: IOrientedLink,
) {
  const rows = await tx
    .select({ status: link.status })
    .from(link)
    .where(
      and(
        eq(link.fromId, oriented.fromId),
        eq(link.toId, oriented.toId),
        eq(link.kind, kind),
        or(
          inArray(link.status, ["proposed", "confirmed"]),
          and(
            eq(link.status, "rejected"),
            gt(link.decidedAt, daysAgo(LINK_LIMITS.rejectCooldownDays)),
          ),
        ),
      ),
    );
  if (rows.some((row) => row.status !== "rejected"))
    throw new ProposeRefused("exists");
  if (rows.length > 0) throw new ProposeRefused("cooldown");
}
