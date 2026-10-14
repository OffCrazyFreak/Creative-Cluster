import { handleEmailJob } from "@/lib/email/email-job-handler.server";

import "@/lib/translation/translate-job-handler.server";

import { registerJobHandler } from "./job-registry.server";

// Entry point for every drain (Netlify functions, pnpm jobs:drain). Another area adds its
// handler by calling registerJobHandler from its own module and importing that module here.
registerJobHandler("email", handleEmailJob);
