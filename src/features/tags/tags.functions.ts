import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicGuard, memberGuard } from "@/server/guards";

import { saveEntryTags } from "./save-entry-tags.server";
import { suggestTag } from "./suggest-tag.server";
import {
  entryTagsInput,
  saveEntryTagsInput,
  suggestTagInput,
} from "./tag-schemas";
import { getEntryTags, listPickerTags } from "./tag-queries.server";

function viewerOf(
  session: { user: { id: string; role?: string | null } } | null,
) {
  return {
    userId: session?.user.id ?? null,
    isAdmin: session?.user.role === "admin",
  };
}

export const listTags = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(({ context }) => listPickerTags(viewerOf(context.session)));

export const getTagsOfEntry = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(entryTagsInput)
  .handler(({ data, context }) =>
    getEntryTags(data.entryId, viewerOf(context.session)),
  );

export const suggestNewTag = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(suggestTagInput)
  .handler(({ data, context }) =>
    suggestTag({ userId: context.user.id, ...data }),
  );

export const saveTagsOfEntry = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(saveEntryTagsInput)
  .handler(({ data, context }) =>
    saveEntryTags({
      ...data,
      actor: {
        userId: context.user.id,
        isAdmin: context.user.role === "admin",
      },
    }),
  );
