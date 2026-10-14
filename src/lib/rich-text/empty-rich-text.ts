import type { RichTextDoc } from "@/typings/rich-text";

export const EMPTY_RICH_TEXT: RichTextDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function richTextFromPlain(text: string): RichTextDoc {
  const paragraphs = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return EMPTY_RICH_TEXT;
  return {
    type: "doc",
    content: paragraphs.map((part) => ({
      type: "paragraph",
      content: [{ type: "text", text: part }],
    })),
  };
}
