import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

import { RICH_TEXT_MAX_DEPTH } from "@/constants/rich-text";

// Same counting as the validator: the node itself is 1, text leaves count.
export function richTextDepth(node: Node): number {
  let deepest = 0;
  node.forEach((child) => {
    deepest = Math.max(deepest, richTextDepth(child));
  });
  return deepest + 1;
}

// Keeps the editor from building a document that parseRichText would reject. Content that is
// already too deep still loads and can be edited as long as no edit makes it deeper.
export const DepthLimit = Extension.create({
  name: "depthLimit",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (transaction) => {
          if (!transaction.docChanged) return true;
          const depth = richTextDepth(transaction.doc);
          return (
            depth <= RICH_TEXT_MAX_DEPTH ||
            depth <= richTextDepth(transaction.before)
          );
        },
      }),
    ];
  },
});
