import "./load-env";

import { ensureParaglide } from "./ensure-paraglide";

await ensureParaglide();
const { drainJobs } = await import("@/lib/jobs/drain-jobs.server");

const result = await drainJobs(60_000);
console.log("Job drain finished", result);
process.exit(0);
