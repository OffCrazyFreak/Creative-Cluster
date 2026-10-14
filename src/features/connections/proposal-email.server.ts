import { eq } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import { user } from "@/db/schema";
import { pageLink } from "@/lib/auth/auth-email.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";

import type { ProposeLinkInput } from "./connections-schemas";

interface IProposalMail {
  linkId: string;
  ownerUserId: string;
  proposerName: string;
  entryName: string;
  input: ProposeLinkInput;
}

// One mail per proposal: the idempotency key is the link id, the rest is the badge in /account.
export async function queueProposalEmail(tx: Tx, mail: IProposalMail) {
  const [owner] = await tx
    .select({ email: user.email, locale: user.locale, banned: user.banned })
    .from(user)
    .where(eq(user.id, mail.ownerUserId))
    .limit(1);
  if (!owner || owner.banned) return;
  const locale = owner.locale === "hr" ? "hr" : "en";
  await enqueueEmail(tx, {
    template: "connection",
    to: owner.email,
    props: {
      locale,
      proposerName: mail.proposerName,
      entryName: mail.entryName,
      kind: mail.input.kind,
      year: mail.input.year,
      note: mail.input.note,
      link: pageLink("/account/connections", locale),
    },
    idempotencyKey: `connection:${mail.linkId}`,
  });
}
