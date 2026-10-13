import { mergeAttributes } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";

import {
  RICH_TEXT_HEADING_LEVELS,
  RICH_TEXT_LINK_REL,
} from "@/constants/rich-text";
import { isHttpUrl } from "@/utils/http-url";

// Only href is stored; rel and target are applied at render time so stored JSON cannot weaken them.
const SafeLink = Link.extend({
  addAttributes() {
    return { href: { default: null } };
  },
  renderHTML({ HTMLAttributes }) {
    if (!isHttpUrl(HTMLAttributes.href)) return ["span", {}, 0];
    return [
      "a",
      mergeAttributes(
        { href: HTMLAttributes.href },
        { rel: RICH_TEXT_LINK_REL },
      ),
      0,
    ];
  },
}).configure({
  openOnClick: false,
  autolink: false,
  linkOnPaste: false,
  defaultProtocol: "https",
  isAllowedUri: (url) => isHttpUrl(url),
});

// The one schema used by the editor, the server validator and the renderer.
export const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [...RICH_TEXT_HEADING_LEVELS] },
    link: false,
    strike: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    hardBreak: false,
    // An extra empty paragraph would make stored JSON differ from what the form holds.
    trailingNode: false,
  }),
  SafeLink,
];
