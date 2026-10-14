import { createServerFn } from "@tanstack/react-start";

import { adminGuard } from "@/server/guards";

import {
  adminEntriesSearchSchema,
  changeSlugSchema,
  entryIdSchema,
  mergeSchema,
  movePinSchema,
  searchSchema,
  transferOwnerSchema,
} from "./admin-entries-schemas";
import { changeSlug } from "./change-slug.server";
import { getAdminEntryDetail } from "./entry-detail.server";
import { listAdminEntries } from "./list-entries.server";
import { mergePartner } from "./merge-partner.server";
import { movePin } from "./move-pin.server";
import { searchRealEntries, searchUsers } from "./search-hits.server";
import { transferOwner } from "./transfer-owner.server";

export const listAdminEntriesFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(adminEntriesSearchSchema)
  .handler(({ data }) => listAdminEntries(data));

export const getAdminEntryDetailFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(entryIdSchema)
  .handler(({ data }) => getAdminEntryDetail(data.id));

export const searchUsersFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(searchSchema)
  .handler(({ data }) => searchUsers(data.q));

export const searchRealEntriesFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(searchSchema)
  .handler(({ data }) => searchRealEntries(data.q));

export const transferOwnerFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(transferOwnerSchema)
  .handler(({ data, context }) =>
    transferOwner(data.id, data.userId, context.user.id),
  );

export const mergePartnerFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(mergeSchema)
  .handler(({ data, context }) =>
    mergePartner(data.stubId, data.targetId, context.user.id),
  );

export const movePinFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(movePinSchema)
  .handler(({ data, context }) =>
    movePin(data.id, { lat: data.lat, lng: data.lng }, context.user.id),
  );

export const changeSlugFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(changeSlugSchema)
  .handler(({ data, context }) =>
    changeSlug(data.id, data.slug, context.user.id),
  );
