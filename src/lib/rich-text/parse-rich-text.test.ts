import { describe, expect, it } from "vitest";

import {
  RICH_TEXT_MAX_BYTES,
  RICH_TEXT_MAX_DEPTH,
  RICH_TEXT_MAX_LINKS,
} from "@/constants/rich-text";
import type { IRichTextMark, IRichTextNode } from "@/typings/rich-text";

import { parseRichText } from "./parse-rich-text";
import { RichTextError, type RichTextErrorReason } from "./rich-text-error";
import { richTextInput } from "./rich-text-input";

function doc(...content: IRichTextNode[]) {
  return { type: "doc", content };
}
function paragraph(...content: IRichTextNode[]): IRichTextNode {
  return { type: "paragraph", content };
}
function text(value: string, ...marks: IRichTextMark[]) {
  return { type: "text", text: value, ...(marks.length ? { marks } : {}) };
}
function link(href: unknown) {
  return { type: "link", attrs: { href } };
}
function reasonOf(json: unknown, maxChars?: number): RichTextErrorReason {
  try {
    parseRichText(json, { maxChars });
  } catch (error) {
    if (error instanceof RichTextError) return error.reason;
    throw error;
  }
  throw new Error("expected a RichTextError");
}

describe("parseRichText", () => {
  it("accepts every supported node and mark and derives plain text", () => {
    const input = doc(
      { type: "heading", attrs: { level: 2 }, content: [text("Title")] },
      paragraph(
        text("a ", { type: "bold" }),
        text("b", { type: "italic" }, { type: "underline" }),
        text(" c", link("https://example.org/x")),
      ),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [paragraph(text("one"))] }],
      },
      {
        type: "orderedList",
        attrs: { start: 1 },
        content: [{ type: "listItem", content: [paragraph(text("two"))] }],
      },
      { type: "blockquote", content: [paragraph(text("quote"))] },
    );
    const parsed = parseRichText(input);
    expect(parsed.text).toBe("Title\na b c\none\ntwo\nquote");
    expect(parsed.doc.type).toBe("doc");
    expect(parsed.length).toBe("Titlea b conetwoquote".length);
  });

  it("drops unknown attributes instead of storing them", () => {
    const input = doc(
      paragraph(
        text("x", {
          type: "link",
          attrs: {
            href: "https://a.b",
            rel: "x",
            target: "_top",
            onclick: "1",
          },
        }),
      ),
    );
    const mark =
      parseRichText(input).doc.content?.[0]?.content?.[0]?.marks?.[0];
    expect(mark).toEqual({ type: "link", attrs: { href: "https://a.b" } });
  });

  it("counts length like the editor and enforces maxChars", () => {
    const input = doc(paragraph(text("abcd")), paragraph(text("efgh")));
    expect(parseRichText(input, { maxChars: 8 }).length).toBe(8);
    expect(reasonOf(input, 7)).toBe("too_long");
  });
});

describe("parseRichText rejects hostile input", () => {
  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "mailto:a@b.c",
    "//evil.example",
    "/relative",
    "",
    42,
    null,
  ])("link href %j", (href) => {
    const input = doc(paragraph(text("x", link(href))));
    expect(reasonOf(input)).toBe("bad_link");
  });

  it("unknown nodes and marks", () => {
    expect(reasonOf(doc({ type: "script", content: [] }))).toBe("invalid");
    expect(reasonOf(doc({ type: "image", attrs: { src: "x" } }))).toBe(
      "invalid",
    );
    expect(reasonOf(doc({ type: "codeBlock", content: [text("x")] }))).toBe(
      "invalid",
    );
    expect(reasonOf(doc(paragraph(text("x", { type: "strike" }))))).toBe(
      "invalid",
    );
    expect(reasonOf(doc(paragraph(text("x", { type: "style" }))))).toBe(
      "invalid",
    );
  });

  it("wrong structure, root and heading level", () => {
    expect(reasonOf({ type: "paragraph" })).toBe("invalid");
    expect(reasonOf(doc(text("loose text")))).toBe("invalid");
    expect(
      reasonOf(
        doc({ type: "heading", attrs: { level: 1 }, content: [text("h")] }),
      ),
    ).toBe("invalid");
    expect(
      reasonOf(
        doc({ type: "heading", attrs: { level: 99 }, content: [text("h")] }),
      ),
    ).toBe("invalid");
    expect(reasonOf("string")).toBe("invalid");
    expect(reasonOf(null)).toBe("invalid");
    expect(reasonOf([])).toBe("invalid");
  });

  it("oversized documents", () => {
    const big = doc(paragraph(text("x".repeat(RICH_TEXT_MAX_BYTES))));
    expect(reasonOf(big)).toBe("too_large");
  });

  it("too deep", () => {
    let node: IRichTextNode = paragraph(text("x"));
    for (let i = 0; i < RICH_TEXT_MAX_DEPTH; i += 1) {
      node = { type: "blockquote", content: [node] };
    }
    expect(reasonOf(doc(node))).toBe("too_deep");
  });

  it("too many links", () => {
    const links = Array.from({ length: RICH_TEXT_MAX_LINKS + 1 }, (_, i) =>
      text(`l${i} `, link(`https://example.org/${i}`)),
    );
    expect(reasonOf(doc(paragraph(...links)))).toBe("too_many_links");
  });

  it("circular input", () => {
    const loop: Record<string, unknown> = { type: "doc" };
    loop.content = [loop];
    expect(["invalid", "too_deep"]).toContain(reasonOf(loop));
  });
});

describe("richTextInput", () => {
  it("returns the parsed doc and reports the reason as an issue", () => {
    const schema = richTextInput(10);
    const ok = schema.safeParse(doc(paragraph(text("hello"))));
    expect(ok.success && ok.data.text).toBe("hello");
    const bad = schema.safeParse(
      doc(paragraph(text("x", link("javascript:1")))),
    );
    expect(bad.success).toBe(false);
    expect(!bad.success && bad.error.issues[0]?.message).toBe("bad_link");
  });
});
