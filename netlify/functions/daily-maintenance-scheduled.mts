import type { Config } from "@netlify/functions";

import { runDailyMaintenance } from "../../src/lib/maintenance/daily-maintenance.server";

// Digests, retention purges and archive checks: once a day, early UTC morning.
export default async () => {
  const result = await runDailyMaintenance();
  console.info("daily-maintenance-scheduled", result);
};

export const config: Config = { schedule: "0 5 * * *" };
