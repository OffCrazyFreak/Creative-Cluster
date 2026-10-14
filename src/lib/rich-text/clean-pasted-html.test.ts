// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { cleanPastedHtml } from "./clean-pasted-html";

describe("cleanPastedHtml", () => {
  it("strips Word noise, styles and empty paragraphs", () => {
    const word =
      "<html><head><style>p{color:red}</style></head><body><!--[if gte mso 9]><xml>x</xml><![endif]-->" +
      '<p class="MsoNormal" style="margin:0">Hello <span style="font-weight:bold;color:red">world</span><o:p></o:p></p>' +
      '<p class="MsoNormal">&nbsp;</p><p><span style="font-style:italic;text-decoration:underline">x</span></p></body></html>';
    expect(cleanPastedHtml(word)).toBe(
      "<p>Hello <strong>world</strong></p><p><u><em>x</em></u></p>",
    );
  });

  it("unwraps the Google Docs fake bold and keeps real bold and hrefs", () => {
    const docs =
      '<b style="font-weight:normal" id="docs-internal-guid-1"><p>Plain <b>bold</b> <a href="https://a.b" style="color:blue">l</a></p></b>';
    expect(cleanPastedHtml(docs)).toBe(
      '<p>Plain <b>bold</b> <a href="https://a.b">l</a></p>',
    );
  });

  it("removes Word list bullet glyphs and their spacers", () => {
    const list =
      '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><!--[if !supportLists]--><span style="font-family:Symbol;mso-list:Ignore">\u00b7<span style="font:7.0pt \'Times New Roman\'">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></span><!--[endif]-->First item</p>' +
      '<p class="MsoListParagraph" style="mso-list:l1 level1 lfo2"><span style="mso-list:Ignore">1.<span>&nbsp;&nbsp;</span></span>Numbered</p>';
    expect(cleanPastedHtml(list)).toBe("<p>First item</p><p>Numbered</p>");
  });

  it("drops images and scripts", () => {
    expect(
      cleanPastedHtml('<p>a<img src="x" onerror="1"><script>x()</script></p>'),
    ).toBe("<p>a</p>");
  });
});
