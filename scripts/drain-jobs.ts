import "./load-env";

import { LOCAL_DRAIN_MS } from "@/constants/jobs";

import { ensureParaglide } from "./ensure-paraglide";

await ensureParaglide();
const { drainJobs } = await import("@/lib/jobs/drain-jobs.server");

const result = await drainJobs(LOCAL_DRAIN_MS);
console.log("Job drain finished", result);
process.exit(0);
