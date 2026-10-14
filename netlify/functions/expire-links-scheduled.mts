import type { Config } from "@netlify/functions";

import { db } from "../../src/db/client.server";
import { withdrawStaleProposals } from "../../src/features/connections/expire-links.server";

// Proposals nobody answered within 60 days are withdrawn; reads already hide them in between.
export default async () => {
  const count = await db.transaction((tx) => withdrawStaleProposals(tx));
  console.info("expire-links-scheduled", { withdrawn: count });
};

export const config: Config = { schedule: "17 3 * * *" };
