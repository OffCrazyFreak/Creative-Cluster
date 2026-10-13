import type { Mark, Node } from "@tiptap/pm/model";

import {
  RICH_TEXT_HEADING_LEVELS,
  RICH_TEXT_MAX_HREF_LENGTH,
  RICH_TEXT_MAX_LINKS,
} from "@/constants/rich-text";
import type { IRichTextMark, IRichTextNode } from "@/typings/rich-text";
import { isHttpUrl } from "@/utils/http-url";

import { RichTextError } from "./rich-text-error";

export interface ISanitizeState {
  links: number;
}

function sanitizeMark(mark: Mark, state: ISanitizeState): IRichTextMark {
  if (mark.type.name !== "link") return { type: mark.type.name };
  const href: unknown = mark.attrs.href;
  if (!isHttpUrl(href) || href.length > RICH_TEXT_MAX_HREF_LENGTH) {
    throw new RichTextError("bad_link");
  }
  state.links += 1;
  if (state.links > RICH_TEXT_MAX_LINKS) {
    throw new RichTextError("too_many_links");
  }
  return { type: "link", attrs: { href } };
}

// Rebuilds the JSON from a schema-checked node, keeping only attributes we know are safe.
export function sanitizeNode(node: Node, state: ISanitizeState): IRichTextNode {
  const name = node.type.name;
  const out: IRichTextNode = { type: name };

  if (name === "heading") {
    const level: unknown = node.attrs.level;
    const allowed = RICH_TEXT_HEADING_LEVELS.some((item) => item === level);
    if (!allowed) throw new RichTextError("invalid");
    out.attrs = { level };
  }
  if (name === "orderedList") {
    const start: unknown = node.attrs.start;
    if (!Number.isInteger(start) || (start as number) < 1) {
      throw new RichTextError("invalid");
    }
    out.attrs = { start: Math.min(start as number, 9999) };
  }
  if (node.isText) out.text = node.text;
  if (node.marks.length > 0) {
    out.marks = node.marks.map((mark) => sanitizeMark(mark, state));
  }
  if (node.childCount > 0) {
    out.content = [];
    node.forEach((child) => out.content?.push(sanitizeNode(child, state)));
  }
  return out;
}
