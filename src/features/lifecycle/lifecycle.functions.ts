import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { NotFoundError } from "@/server/errors";
import { adminGuard, memberGuard } from "@/server/guards";
import { runInBackground } from "@/lib/auth/background-task.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";

import {
  archiveEntryAsAdmin,
  reinstateEntry,
  restoreEntryAsAdmin,
  setEntryTrusted,
  suspendEntry,
} from "./admin-lifecycle.server";
import { getAdminEntry } from "./admin-entry.server";
import {
  entryIdSchema,
  suspendSchema,
  trustedSchema,
  unarchiveSchema,
} from "./lifecycle-schemas";
import {
  archiveOwnListing,
  confirmOwnListing,
  getOwnListingStatus,
  unarchiveOwnListing,
  withdrawOwnConsent,
} from "./owner-lifecycle.server";

// Expected "not in that state" answers are results, so the buttons can say so instead of crashing.
async function attempt(action: () => Promise<unknown>) {
  try {
    await action();
    runInBackground(triggerDrain());
    return { ok: true as const };
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: false as const };
    throw error;
  }
}

export const getAdminEntryFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(entryIdSchema)
  .handler(({ data }) => getAdminEntry(data.id));

export const suspendEntryFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(suspendSchema)
  .handler(({ data, context }) =>
    attempt(() => suspendEntry(data.id, data.reason, context.user.id)),
  );

export const reinstateEntryFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(entryIdSchema)
  .handler(({ data, context }) =>
    attempt(() => reinstateEntry(data.id, context.user.id)),
  );

export const archiveEntryAdminFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(entryIdSchema)
  .handler(({ data, context }) =>
    attempt(() => archiveEntryAsAdmin(data.id, context.user.id)),
  );

export const restoreEntryAdminFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(entryIdSchema)
  .handler(({ data, context }) =>
    attempt(() => restoreEntryAsAdmin(data.id, context.user.id)),
  );

export const setTrustedFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(trustedSchema)
  .handler(({ data, context }) =>
    attempt(() => setEntryTrusted(data.id, data.trusted, context.user.id)),
  );

export const getOwnListingStatusFn = createServerFn({ method: "GET" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(({ context }) => getOwnListingStatus(context.user.id));

export const archiveOwnListingFn = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(({ context }) => attempt(() => archiveOwnListing(context.user.id)));

export const unarchiveOwnListingFn = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(unarchiveSchema)
  .handler(async ({ data, context }) => {
    try {
      return await unarchiveOwnListing(context.user.id, data.consent);
    } catch (error) {
      if (error instanceof NotFoundError)
        return { status: "unavailable" as const };
      throw error;
    }
  });

export const withdrawConsentFn = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(({ context }) => attempt(() => withdrawOwnConsent(context.user.id)));

export const confirmOwnListingFn = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(({ context }) => attempt(() => confirmOwnListing(context.user.id)));
