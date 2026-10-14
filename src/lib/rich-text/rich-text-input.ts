import { z } from "zod";

import type { RichTextDoc } from "@/typings/rich-text";

import { parseRichText, type IParsedRichText } from "./parse-rich-text";
import { RichTextError } from "./rich-text-error";

// Zod field for server function inputs: takes the editor's JSON, yields the validated doc plus text.
export function richTextInput(maxChars: number) {
  return z.custom<RichTextDoc>().transform((value, ctx): IParsedRichText => {
    try {
      return parseRichText(value, { maxChars });
    } catch (error) {
      if (!(error instanceof RichTextError)) throw error;
      ctx.addIssue({ code: "custom", message: error.reason });
      return z.NEVER;
    }
  });
}
