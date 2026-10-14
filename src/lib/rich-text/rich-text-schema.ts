import { getSchema } from "@tiptap/core";

import { richTextExtensions } from "./extensions";

export const richTextSchema = getSchema(richTextExtensions);
