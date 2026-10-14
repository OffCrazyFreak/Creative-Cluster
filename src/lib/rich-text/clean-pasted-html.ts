const DROP_SELECTOR =
  "style, script, meta, link, xml, title, head, o\\:p, img, svg, object, iframe";

// Word and Google Docs wrap pasted text in styling markup the schema ignores anyway; this removes the
// noise (conditional comments, style blocks, fake bold wrappers) before ProseMirror parses it.
export function cleanPastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");

  const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((node) => node.parentNode?.removeChild(node));

  parsed.body.querySelectorAll(DROP_SELECTOR).forEach((el) => el.remove());

  // Word keeps its list bullet and number glyphs as text in spans marked mso-list:Ignore.
  parsed.body.querySelectorAll("span[style]").forEach((el) => {
    if (/mso-list:\s*ignore/i.test(el.getAttribute("style") ?? "")) el.remove();
  });

  // Google Docs wraps everything in <b style="font-weight:normal">; it is not bold.
  parsed.body.querySelectorAll("b, strong").forEach((el) => {
    const weight = el
      .getAttribute("style")
      ?.match(/font-weight:\s*(\w+)/i)?.[1];
    if (weight === "normal" || weight === "400")
      el.replaceWith(...el.childNodes);
  });

  // Word marks bold, italic and underline in spans only.
  parsed.body.querySelectorAll("span[style]").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    const wrappers = [
      [/font-weight:\s*(bold|[6-9]00)/i, "strong"],
      [/font-style:\s*italic/i, "em"],
      [/text-decoration[^;]*underline/i, "u"],
    ] as const;
    let inner: Node[] = [...el.childNodes];
    for (const [pattern, tag] of wrappers) {
      if (!pattern.test(style)) continue;
      const wrapper = parsed.createElement(tag);
      wrapper.append(...inner);
      inner = [wrapper];
    }
    el.replaceWith(...inner);
  });

  parsed.body.querySelectorAll("*").forEach((el) => {
    for (const name of el.getAttributeNames()) {
      if (name !== "href" && name !== "start") el.removeAttribute(name);
    }
  });

  // Word pastes empty paragraphs (&nbsp;) as spacing.
  parsed.body.querySelectorAll("p").forEach((el) => {
    if ((el.textContent ?? "").trim() === "") el.remove();
  });

  return parsed.body.innerHTML;
}
