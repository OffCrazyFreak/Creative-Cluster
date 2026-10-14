import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
import { InvalidTownError } from "./apply-entry-fields";
import { checkFormToken, issueFormToken } from "./apply-form-token.server";
import { findSimilarEntries } from "./similar-entries.server";
import {
  previewApplicationVerification,
  verifyApplication,
} from "./verify-application.server";

export const submitApplicationFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(submitApplicationSchema)
  .handler(async ({ data }): Promise<SubmitApplicationResult> => {
    // A filled honeypot, a forged token or a too-fast send is never a fake success: the person (or a
    // script) gets a plain "try again", so a wrongly flagged human is never left waiting for a mail.
    if (data.referenceCode !== "" || checkFormToken(data.formToken) !== "ok")
      return { status: "retry" };
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
      if (error instanceof InvalidTownError) return { status: "invalid_town" };
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

export const getApplyFormTokenFn = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(() => issueFormToken());
