import { timingSafeEqual } from "node:crypto";

import type { Config } from "@netlify/functions";

import {
  DRAIN_HEADER,
  drainToken,
} from "../../src/lib/jobs/trigger-drain.server";
import { drainJobs } from "../../src/lib/jobs/drain-jobs.server";

function tokenMatches(received: string | null): boolean {
  const expected = Buffer.from(drainToken());
  const actual = Buffer.from(received ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Called by the app after a save; runs up to 15 minutes, answers 202 at once.
export default async (request: Request) => {
  if (!tokenMatches(request.headers.get(DRAIN_HEADER))) {
    console.warn(
      "drain-jobs-background: rejected request without a valid token",
    );
    return;
  }
  const result = await drainJobs(5 * 60 * 1000);
  console.info("drain-jobs-background", result);
};

export const config: Config = { background: true };
