import type { IRichTextMark, IRichTextNode } from "@/typings/rich-text";

import { RichTextError } from "./rich-text-error";

const TAG_PATTERN = /<(\/?)(\d+)>/g;

function escapeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function unescapeText(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

export interface ITaggedBlock {
  text: string;
  // tags[n - 1] holds the marks (with hrefs) for tag n; they never travel through translation.
  tags: IRichTextMark[][];
}

// Inline text nodes become "Hello <1>bold <2>link</2></1>"; each mark span gets its own number.
export function tagInlineNodes(nodes: IRichTextNode[]): ITaggedBlock {
  const tags: IRichTextMark[][] = [];
  const open: { key: string; id: number }[] = [];
  let text = "";

  for (const node of nodes) {
    const marks = node.marks ?? [];
    const keys = marks.map((mark) => JSON.stringify(mark));
    let keep = 0;
    while (
      keep < open.length &&
      keep < keys.length &&
      open[keep]?.key === keys[keep]
    ) {
      keep += 1;
    }
    while (open.length > keep) text += `</${open.pop()?.id}>`;
    for (let i = keep; i < marks.length; i += 1) {
      tags.push([marks[i]]);
      open.push({ key: keys[i], id: tags.length });
      text += `<${tags.length}>`;
    }
    text += escapeText(node.text ?? "");
  }
  while (open.length > 0) text += `</${open.pop()?.id}>`;
  return { text, tags };
}

type Token =
  { kind: "text"; value: string } | { kind: "open" | "close"; id: number };

function tokenize(value: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of value.matchAll(TAG_PATTERN)) {
    const index = match.index ?? 0;
    tokens.push({ kind: "text", value: value.slice(last, index) });
    tokens.push({ kind: match[1] ? "close" : "open", id: Number(match[2]) });
    last = index + match[0].length;
  }
  tokens.push({ kind: "text", value: value.slice(last) });
  return tokens;
}

function tagIds(value: string, kind: "open" | "close") {
  return tokenize(value)
    .flatMap((token) => (token.kind === kind ? [token.id] : []))
    .sort((a, b) => a - b);
}

// Same set of tags, each opened once and closed once, properly nested; used before rebuilding.
export function hasMatchingTags(source: string, translated: string): boolean {
  const expected = tagIds(source, "open").join();
  if (tagIds(translated, "open").join() !== expected) return false;
  if (tagIds(translated, "close").join() !== expected) return false;
  const stack: number[] = [];
  for (const token of tokenize(translated)) {
    if (token.kind === "open") stack.push(token.id);
    if (token.kind === "close" && stack.pop() !== token.id) return false;
  }
  return stack.length === 0;
}

export function untagInlineNodes(
  translated: string,
  block: ITaggedBlock,
): IRichTextNode[] {
  if (!hasMatchingTags(block.text, translated)) {
    throw new RichTextError("bad_tags");
  }
  const nodes: IRichTextNode[] = [];
  const active: number[] = [];
  for (const token of tokenize(translated)) {
    if (token.kind === "open") active.push(token.id);
    else if (token.kind === "close") active.pop();
    else if (token.kind === "text") {
      if (/[<>]/.test(token.value)) throw new RichTextError("bad_tags");
      const text = unescapeText(token.value);
      if (text === "") continue;
      const marks = active.flatMap((id) => block.tags[id - 1] ?? []);
      nodes.push({
        type: "text",
        text,
        ...(marks.length > 0 ? { marks } : {}),
      });
    }
  }
  return nodes;
}
