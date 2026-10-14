import { createServerFn } from "@tanstack/react-start";

import { APPLY_MIN_FILL_SECONDS } from "@/constants/apply";
import { runInBackground } from "@/lib/auth/background-task.server";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import {
  TurnstileError,
  verifyTurnstile,
} from "@/lib/turnstile/verify-turnstile.server";
import { publicGuard } from "@/server/guards";
import { LimitError, NotFoundError } from "@/server/errors";
import { clientIp } from "@/server/request.server";

import {
  applicationTokenSchema,
  similarNameSchema,
  submitApplicationSchema,
  type SubmitApplicationResult,
} from "./apply-schemas";
import { loadRejectedApplication } from "./application-edit.server";
import { createApplication, resubmitApplication } from "./apply.server";
import { findSimilarEntries } from "./similar-entries.server";
import {
  previewApplicationVerification,
  verifyApplication,
} from "./verify-application.server";

function filledTooFast(startedAt: number): boolean {
  return Date.now() - startedAt < APPLY_MIN_FILL_SECONDS * 1000;
}

export const submitApplicationFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(submitApplicationSchema)
  .handler(async ({ data }): Promise<SubmitApplicationResult> => {
    // Bots get the same answer as people so they learn nothing from a rejection.
    if (data.nickname !== "" || filledTooFast(data.startedAt))
      return { status: "verify" };
    try {
      await verifyTurnstile(data.turnstileToken);
      const ip = clientIp();
      await enforceLimits([
        { key: `apply:ip:${ip}`, max: 5, windowSeconds: 3600 },
        { key: `apply:ip-day:${ip}`, max: 15, windowSeconds: 86_400 },
        {
          key: `apply:email:${data.application.contactEmail.toLowerCase()}`,
          max: 3,
          windowSeconds: 86_400,
        },
        { key: "apply:site", max: 300, windowSeconds: 86_400 },
      ]);
      const result = data.resubmitToken
        ? await resubmitApplication(data.application, data.resubmitToken)
        : await createApplication(data.application, data.locale);
      runInBackground(triggerDrain());
      return result;
    } catch (error) {
      if (error instanceof TurnstileError) return { status: "captcha" };
      if (error instanceof LimitError) return { status: "limited" };
      if (error instanceof NotFoundError) return { status: "expired" };
      throw error;
    }
  });

export const findSimilarEntriesFn = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(similarNameSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `apply-similar:${clientIp()}`, max: 240, windowSeconds: 3600 },
    ]);
    return findSimilarEntries(data.name);
  });

export const getApplicationVerification = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(applicationTokenSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `apply-verify-view:${clientIp()}`, max: 60, windowSeconds: 3600 },
    ]);
    return previewApplicationVerification(data.token);
  });

export const confirmApplicationEmail = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(applicationTokenSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `apply-verify:${clientIp()}`, max: 20, windowSeconds: 3600 },
    ]);
    const result = await verifyApplication(data.token);
    runInBackground(triggerDrain());
    return result;
  });

export const getRejectedApplication = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(applicationTokenSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `apply-edit-view:${clientIp()}`, max: 60, windowSeconds: 3600 },
    ]);
    return loadRejectedApplication(data.token);
  });
