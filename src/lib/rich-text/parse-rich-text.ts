import type { Node } from "@tiptap/pm/model";

import {
  RICH_TEXT_MAX_BYTES,
  RICH_TEXT_MAX_DEPTH,
  RICH_TEXT_MAX_NODES,
} from "@/constants/rich-text";
import type { RichTextDoc } from "@/typings/rich-text";

import { RichTextError } from "./rich-text-error";
import { richTextSchema } from "./rich-text-schema";
import { sanitizeNode } from "./sanitize-node";

export interface IParseRichTextOptions {
  // Character limit on text; same counting rule as the editor's character count.
  maxChars?: number;
}

export interface IParsedRichText {
  doc: RichTextDoc;
  // Block-separated plain text for the `*_text` columns and search.
  text: string;
  // Characters as the editor counts them; use this for limits.
  length: number;
}

// Cheap pass over the raw JSON so hostile input is rejected before ProseMirror builds a tree.
function checkShape(json: unknown) {
  let nodes = 0;
  function visit(value: unknown, depth: number) {
    if (depth > RICH_TEXT_MAX_DEPTH) throw new RichTextError("too_deep");
    nodes += 1;
    if (nodes > RICH_TEXT_MAX_NODES) throw new RichTextError("too_many_nodes");
    const content = (value as { content?: unknown } | null)?.content;
    if (Array.isArray(content)) content.forEach((c) => visit(c, depth + 1));
  }
  visit(json, 1);
}

function byteLength(json: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(json)).length;
  } catch {
    throw new RichTextError("invalid");
  }
}

function buildNode(json: unknown): Node {
  try {
    const node = richTextSchema.nodeFromJSON(json);
    if (node.type.name !== "doc") throw new RichTextError("invalid");
    node.check();
    return node;
  } catch (error) {
    if (error instanceof RichTextError) throw error;
    throw new RichTextError("invalid");
  }
}

export function parseRichText(
  json: unknown,
  { maxChars }: IParseRichTextOptions = {},
): IParsedRichText {
  if (typeof json !== "object" || json === null) {
    throw new RichTextError("invalid");
  }
  if (byteLength(json) > RICH_TEXT_MAX_BYTES) {
    throw new RichTextError("too_large");
  }
  checkShape(json);

  const node = buildNode(json);
  const doc = sanitizeNode(node, { links: 0 }) as RichTextDoc;
  const length = node.textBetween(0, node.content.size, undefined, " ").length;
  if (maxChars !== undefined && length > maxChars) {
    throw new RichTextError("too_long");
  }
  const text = node
    .textBetween(0, node.content.size, "\n", " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return { doc, text, length };
}

export function safeParseRichText(
  json: unknown,
  options?: IParseRichTextOptions,
): IParsedRichText | null {
  try {
    return parseRichText(json, options);
  } catch (error) {
    if (error instanceof RichTextError) return null;
    throw error;
  }
}
