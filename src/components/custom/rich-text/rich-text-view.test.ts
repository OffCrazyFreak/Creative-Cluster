import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RichTextDoc } from "@/typings/rich-text";

import RichTextView from "./rich-text-view";

function render(doc: unknown) {
  return renderToStaticMarkup(
    createElement(RichTextView, { doc: doc as RichTextDoc }),
  );
}

function linked(href: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "go",
            marks: [{ type: "link", attrs: { href } }],
          },
        ],
      },
    ],
  };
}

describe("RichTextView", () => {
  it("renders elements with safe link attributes", () => {
    const html = render(linked("https://example.org/a?b=1&c=2"));
    expect(html).toContain('href="https://example.org/a?b=1&amp;c=2"');
    expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
  });

  it("drops javascript links, unknown nodes and unknown marks at render time", () => {
    const bad = render(linked("javascript:alert(1)"));
    expect(bad).not.toContain("<a");
    expect(bad).toContain("go");
    const unknown = render({
      type: "doc",
      content: [
        { type: "script", content: [{ type: "text", text: "evil" }] },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "kept",
              marks: [{ type: "style", attrs: { x: 1 } }],
            },
          ],
        },
      ],
    });
    expect(unknown).not.toContain("script");
    expect(unknown).not.toContain("evil");
    expect(unknown).toContain("<p>kept</p>");
    expect(render(null)).toBe("");
  });

  it("escapes markup in text", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<img src=x onerror=alert(1)>" }],
        },
      ],
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
