import { describe, expect, it } from "vitest";

import { hasMatchingTags } from "./inline-tags";
import { parseRichText } from "./parse-rich-text";
import { RichTextError } from "./rich-text-error";
import { rebuildRichText, splitRichText } from "./translation-blocks";

const doc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Hello" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "See " },
        {
          type: "text",
          text: "our ",
          marks: [
            { type: "link", attrs: { href: "https://example.org/a?x=1&y=2" } },
          ],
        },
        {
          type: "text",
          text: "site",
          marks: [
            { type: "link", attrs: { href: "https://example.org/a?x=1&y=2" } },
            { type: "bold" },
          ],
        },
        { type: "text", text: " & a < b" },
      ],
    },
    { type: "paragraph" },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "item", marks: [{ type: "italic" }] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("splitRichText", () => {
  it("numbers inline tags, escapes text and keeps hrefs out of the blocks", () => {
    const { blocks, skeleton } = splitRichText(doc);
    expect(blocks).toEqual([
      "Hello",
      "See <1>our <2>site</2></1> &amp; a &lt; b",
      "<1>item</1>",
    ]);
    expect(blocks.join()).not.toContain("example.org");
    expect(skeleton.slots).toHaveLength(3);
    expect(JSON.stringify(skeleton)).toContain("example.org");
  });

  it("round-trips unchanged text", () => {
    const { blocks, skeleton } = splitRichText(doc);
    const rebuilt = rebuildRichText(skeleton, blocks);
    expect(rebuilt.doc).toEqual(parseRichText(doc).doc);
  });

  it("rebuilds translated text with the hrefs restored", () => {
    const { skeleton } = splitRichText(doc);
    const rebuilt = rebuildRichText(skeleton, [
      "Pozdrav",
      "Pogledaj <1>nasu <2>stranicu</2></1> &amp; a &lt; b",
      "<1>stavka</1>",
    ]);
    expect(rebuilt.text).toBe(
      "Pozdrav\nPogledaj nasu stranicu & a < b\nstavka",
    );
    const link = rebuilt.doc.content?.[1]?.content?.[1];
    expect(link?.marks).toEqual([
      { type: "link", attrs: { href: "https://example.org/a?x=1&y=2" } },
    ]);
  });
});

describe("tag checks", () => {
  const source = "a <1>b <2>c</2></1>";
  it("accepts reordered but well nested tags", () => {
    expect(hasMatchingTags(source, "<1>x <2>y</2></1> z")).toBe(true);
  });
  it.each([
    "a b c",
    "a <1>b <2>c</1></2>",
    "a <1>b c</1>",
    "a <1>b <2>c</2></1><2>d</2>",
    "a <1>b <3>c</3></1>",
  ])("rejects %s", (translated) => {
    expect(hasMatchingTags(source, translated)).toBe(false);
  });

  it("rebuild throws bad_tags and rejects stray markup", () => {
    const { skeleton } = splitRichText(doc);
    function bad(blocks: string[]) {
      try {
        rebuildRichText(skeleton, blocks);
      } catch (error) {
        return error instanceof RichTextError ? error.reason : "other";
      }
      return "none";
    }
    const good = ["Pozdrav", "<1>a <2>b</2></1>", "<1>c</1>"];
    expect(bad(good)).toBe("none");
    expect(bad(["Pozdrav", "<1>a</1>", "<1>c</1>"])).toBe("bad_tags");
    expect(
      bad(["Pozdrav", "<script>x</script> <1>a <2>b</2></1>", "<1>c</1>"]),
    ).toBe("bad_tags");
    expect(bad(["Pozdrav"])).toBe("bad_tags");
  });
});
