import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import Markdown, { defaultUrlTransform } from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface IMarkdownContentProps {
  source: string;
}

type AnchorProps = ComponentProps<"a">;

function ContentLink({ href, children }: AnchorProps) {
  if (href === "gap:") return <mark>{children}</mark>;
  if (href?.startsWith("/")) {
    return <Link to={href as "/"}>{children}</Link>;
  }
  return (
    <a href={href} rel="noopener noreferrer">
      {children}
    </a>
  );
}

const components: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-semibold">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="pt-4 text-xl font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="pt-2 text-lg font-semibold">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="flex list-disc flex-col gap-1 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="flex list-decimal flex-col gap-1 pl-6">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="pl-4">{children}</blockquote>
  ),
  a: ContentLink,
};

// react-markdown never renders raw HTML unless a rehype plugin is added; none is.
export default function MarkdownContent({ source }: IMarkdownContentProps) {
  return (
    <div className="flex flex-col gap-4">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) =>
          url === "gap:" ? url : defaultUrlTransform(url)
        }
      >
        {source}
      </Markdown>
    </div>
  );
}
