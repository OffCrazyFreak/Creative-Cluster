import type { RichTextDoc } from "@/typings/rich-text";

// One paragraph per non-empty line; the old app stored descriptions as plain text.
export function plainTextToDoc(text: string): RichTextDoc {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    })),
  };
}
