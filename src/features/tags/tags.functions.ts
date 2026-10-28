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
import { tagViewer } from "./tag-viewer.server";

export const listTags = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(async ({ context }) =>
    listPickerTags(await tagViewer(context.session)),
  );

export const getTagsOfEntry = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(entryTagsInput)
  .handler(async ({ data, context }) =>
    getEntryTags(data.entryId, await tagViewer(context.session)),
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
