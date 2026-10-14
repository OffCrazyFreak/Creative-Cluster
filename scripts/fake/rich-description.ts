import type { RichTextDoc } from "../../src/typings/rich-text";

function paragraph(text: string, bold = false) {
  return {
    type: "paragraph",
    content: [
      { type: "text", text, ...(bold ? { marks: [{ type: "bold" }] } : {}) },
    ],
  };
}

// A short rich description (lead paragraph plus a bullet list) with the plain text the search index stores.
export function richDescription(
  lead: string,
  points: string[],
): { doc: RichTextDoc; text: string } {
  const doc: RichTextDoc = {
    type: "doc",
    content: [
      paragraph(lead, true),
      {
        type: "bulletList",
        content: points.map((point) => ({
          type: "listItem",
          content: [paragraph(point)],
        })),
      },
    ],
  };
  return { doc, text: [lead, ...points].join("\n") };
}
