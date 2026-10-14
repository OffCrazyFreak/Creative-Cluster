import { createServerFn } from "@tanstack/react-start";
import { runInBackground } from "@/lib/auth/background-task.server";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import {
  TurnstileError,
  verifyTurnstile,
} from "@/lib/turnstile/verify-turnstile.server";
import { adminGuard, publicGuard } from "@/server/guards";
import { LimitError, NotFoundError } from "@/server/errors";
import { clientIp } from "@/server/request.server";

import { decideReviewItems } from "./decide-review.server";
import { createReport } from "./report.server";
import { listReviewItems } from "./review-queue.server";
import {
  decideReviewSchema,
  reportSchema,
  reviewListSchema,
  type ReportResult,
} from "./review-schemas";

export const listReviewItemsFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(reviewListSchema)
  .handler(({ data }) => listReviewItems(data));

export const decideReviewItemsFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(decideReviewSchema)
  .handler(async ({ data, context }) => {
    const results = await decideReviewItems(data, context.user.id);
    runInBackground(triggerDrain());
    return results;
  });

export const reportEntryFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(reportSchema)
  .handler(async ({ data }): Promise<ReportResult> => {
    // A filled honeypot gets the same answer as a real report.
    if (data.fax !== "") return { status: "sent" };
    try {
      await verifyTurnstile(data.turnstileToken);
      const ip = clientIp();
      await enforceLimits([
        { key: `report:ip:${ip}`, max: 5, windowSeconds: 3600 },
        {
          key: `report:entry:${ip}:${data.entryId}`,
          max: 1,
          windowSeconds: 86_400,
        },
        { key: "report:site", max: 200, windowSeconds: 86_400 },
      ]);
      await createReport(data);
      return { status: "sent" };
    } catch (error) {
      if (error instanceof TurnstileError) return { status: "captcha" };
      if (error instanceof LimitError) return { status: "limited" };
      // A listing that vanished meanwhile needs no report.
      if (error instanceof NotFoundError) return { status: "sent" };
      throw error;
    }
  });
