// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { RICH_TEXT_MAX_DEPTH } from "@/constants/rich-text";
import type { IRichTextNode } from "@/typings/rich-text";

import { DepthLimit, richTextDepth } from "./depth-limit";
import { richTextExtensions } from "./extensions";
import { parseRichText } from "./parse-rich-text";
import { RichTextError } from "./rich-text-error";
import { richTextSchema } from "./rich-text-schema";

// doc > blockquote x n > paragraph > text is n + 3 deep.
function quoted(depth: number): IRichTextNode {
  let node: IRichTextNode = {
    type: "paragraph",
    content: [{ type: "text", text: "x" }],
  };
  for (let i = 0; i < depth - 3; i += 1) {
    node = { type: "blockquote", content: [node] };
  }
  return { type: "doc", content: [node] };
}

function nestedBullets(levels: number): IRichTextNode {
  let node: IRichTextNode = {
    type: "paragraph",
    content: [{ type: "text", text: "x" }],
  };
  for (let i = 0; i < levels; i += 1) {
    node = {
      type: "bulletList",
      content: [{ type: "listItem", content: [node] }],
    };
  }
  return { type: "doc", content: [node] };
}

function rejects(json: unknown) {
  try {
    parseRichText(json);
  } catch (error) {
    return error instanceof RichTextError && error.reason === "too_deep";
  }
  return false;
}

describe("editor and validator agree on depth", () => {
  it("measures the same depth", () => {
    const doc = quoted(RICH_TEXT_MAX_DEPTH);
    expect(richTextDepth(richTextSchema.nodeFromJSON(doc))).toBe(
      RICH_TEXT_MAX_DEPTH,
    );
  });

  it("the validator accepts exactly what the editor accepts", () => {
    const allowed = quoted(RICH_TEXT_MAX_DEPTH);
    const tooDeep = quoted(RICH_TEXT_MAX_DEPTH + 1);
    expect(rejects(allowed)).toBe(false);
    expect(rejects(tooDeep)).toBe(true);

    const editor = new Editor({
      extensions: [...richTextExtensions, DepthLimit],
    });
    editor.commands.setContent(tooDeep);
    expect(rejects(editor.getJSON())).toBe(false);
    expect(richTextDepth(editor.state.doc)).toBeLessThan(
      RICH_TEXT_MAX_DEPTH + 1,
    );
    editor.commands.setContent(allowed);
    expect(richTextDepth(editor.state.doc)).toBe(RICH_TEXT_MAX_DEPTH);
    editor.destroy();
  });

  it("allows at least four nested bullet levels", () => {
    expect(rejects(nestedBullets(4))).toBe(false);
    expect(rejects(nestedBullets(8))).toBe(false);
  });
});
