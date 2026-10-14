import "./load-env";

import { ensureParaglide } from "./ensure-paraglide";

await ensureParaglide();
const { runDailyMaintenance } =
  await import("@/lib/maintenance/daily-maintenance.server");

console.log("Daily maintenance finished", await runDailyMaintenance());
process.exit(0);
