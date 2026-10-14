import type { RichTextDoc, IRichTextNode } from "@/typings/rich-text";

import {
  tagInlineNodes,
  untagInlineNodes,
  type ITaggedBlock,
} from "./inline-tags";
import {
  parseRichText,
  type IParsedRichText,
  type IParseRichTextOptions,
} from "./parse-rich-text";
import { RichTextError } from "./rich-text-error";

export { hasMatchingTags } from "./inline-tags";

const TEXT_BLOCKS = new Set(["paragraph", "heading"]);

// JSON-serialisable (safe to keep in a job payload): the doc with translatable text removed.
export interface IRichTextSkeleton {
  doc: RichTextDoc;
  // `source` is the tagged text sent out; the translation must carry the same tags.
  slots: { path: number[]; source: string; tags: ITaggedBlock["tags"] }[];
}

export interface ISplitRichText {
  // Strings to translate, one per non-empty paragraph or heading, in document order.
  blocks: string[];
  skeleton: IRichTextSkeleton;
}

export function splitRichText(input: unknown): ISplitRichText {
  const { doc } = parseRichText(input);
  const skeletonDoc = structuredClone(doc);
  const blocks: string[] = [];
  const slots: IRichTextSkeleton["slots"] = [];

  function visit(node: IRichTextNode, path: number[]) {
    if (TEXT_BLOCKS.has(node.type) && node.content?.length) {
      const tagged = tagInlineNodes(node.content);
      blocks.push(tagged.text);
      slots.push({ path, source: tagged.text, tags: tagged.tags });
      delete node.content;
      return;
    }
    node.content?.forEach((child, index) => visit(child, [...path, index]));
  }
  visit(skeletonDoc, []);
  return { blocks, skeleton: { doc: skeletonDoc, slots } };
}

// Throws RichTextError("bad_tags") when the translated tags do not match the source ones.
export function rebuildRichText(
  skeleton: IRichTextSkeleton,
  translatedBlocks: string[],
  options?: IParseRichTextOptions,
): IParsedRichText {
  const { slots } = skeleton;
  if (translatedBlocks.length !== slots.length) {
    throw new RichTextError("bad_tags");
  }
  const doc = structuredClone(skeleton.doc);
  slots.forEach((slot, index) => {
    let node: IRichTextNode | undefined = doc;
    for (const step of slot.path) node = node?.content?.[step];
    if (!node) throw new RichTextError("invalid");
    const content = untagInlineNodes(translatedBlocks[index], {
      text: slot.source,
      tags: slot.tags,
    });
    if (content.length > 0) node.content = content;
  });
  return parseRichText(doc, options);
}
