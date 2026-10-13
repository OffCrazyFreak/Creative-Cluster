import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminGuard } from "@/server/guards";

import { decideSuggestion } from "./decide-suggestion.server";
import { listAdminTags } from "./list-admin-tags.server";
import { mergeTags } from "./merge-tags.server";
import {
  decideSuggestionInput,
  mergeTagsInput,
  updateTagInput,
} from "./tag-schemas";
import { updateTag } from "./update-tag.server";

export const listTagsForAdmin = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.void())
  .handler(() => listAdminTags());

export const updateTagAsAdmin = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(updateTagInput)
  .handler(({ data, context }) =>
    updateTag({ ...data, adminId: context.user.id }),
  );

export const decideTagSuggestion = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(decideSuggestionInput)
  .handler(({ data, context }) =>
    decideSuggestion({ ...data, adminId: context.user.id }),
  );

export const mergeTagsAsAdmin = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(mergeTagsInput)
  .handler(({ data, context }) =>
    mergeTags({ ...data, adminId: context.user.id }),
  );
