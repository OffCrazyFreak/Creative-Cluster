import { renderJSONContentToReactElement } from "@tiptap/static-renderer/json/react";
import type { ReactNode } from "react";

import {
  RICH_TEXT_HEADING_LEVELS,
  RICH_TEXT_LINK_REL,
} from "@/constants/rich-text";
import { cn } from "@/lib/utils";
import type { RichTextDoc } from "@/typings/rich-text";
import { isHttpUrl } from "@/utils/http-url";

import { RICH_TEXT_CLASSES } from "./rich-text-classes";

interface IRichTextViewProps {
  doc: RichTextDoc | null | undefined;
  className?: string;
  lang?: string;
}

interface INodeProps {
  node: { attrs?: Record<string, unknown>; text?: string };
  children?: ReactNode;
}

interface IMarkProps {
  mark: { attrs?: Record<string, unknown> };
  children?: ReactNode;
}

function Heading({ node, children }: INodeProps) {
  const level = RICH_TEXT_HEADING_LEVELS.find(
    (item) => item === node.attrs?.level,
  );
  return level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
}

function OrderedList({ node, children }: INodeProps) {
  const start = node.attrs?.start;
  return <ol start={typeof start === "number" ? start : 1}>{children}</ol>;
}

function Link({ mark, children }: IMarkProps) {
  const href = mark.attrs?.href;
  if (!isHttpUrl(href)) return <>{children}</>;
  return (
    <a href={href} rel={RICH_TEXT_LINK_REL}>
      {children}
    </a>
  );
}

// Plain JSON mapping keeps ProseMirror out of public pages. Anything not listed here renders
// nothing (unknown nodes) or only its text (unknown marks), so stored JSON cannot inject elements.
const render = renderJSONContentToReactElement({
  nodeMapping: {
    doc: ({ children }: INodeProps) => <>{children}</>,
    paragraph: ({ children }: INodeProps) => <p>{children}</p>,
    text: ({ node }: INodeProps) => <>{node.text}</>,
    heading: Heading,
    bulletList: ({ children }: INodeProps) => <ul>{children}</ul>,
    orderedList: OrderedList,
    listItem: ({ children }: INodeProps) => <li>{children}</li>,
    blockquote: ({ children }: INodeProps) => (
      <blockquote>{children}</blockquote>
    ),
  },
  markMapping: {
    bold: ({ children }: IMarkProps) => <strong>{children}</strong>,
    italic: ({ children }: IMarkProps) => <em>{children}</em>,
    underline: ({ children }: IMarkProps) => <u>{children}</u>,
    link: Link,
  },
  unhandledNode: () => null,
  unhandledMark: ({ children }: IMarkProps) => <>{children}</>,
});

// Renders the stored JSON, which parseRichText validated when it was written.
export default function RichTextView({
  doc,
  className,
  lang,
}: IRichTextViewProps) {
  if (!doc) return null;
  return (
    <div className={cn(RICH_TEXT_CLASSES, className)} lang={lang}>
      {render({ content: doc })}
    </div>
  );
}
