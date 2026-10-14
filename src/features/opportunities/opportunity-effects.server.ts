import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";

// Run after the transaction commits: the map payload is cached and mail and translation are jobs.
export async function afterOpportunityChange() {
  invalidateMapDirectory();
  await triggerDrain();
}
