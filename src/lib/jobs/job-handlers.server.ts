import { handleEmailJob } from "@/lib/email/email-job-handler.server";

import "@/lib/translation/translate-job-handler.server";

import { registerJobHandler } from "./job-registry.server";

// A new job type registers with registerJobHandler in its own module and is imported here.
registerJobHandler("email", handleEmailJob);
