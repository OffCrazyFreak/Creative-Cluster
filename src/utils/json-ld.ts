// Escapes everything that could end the script element or break the JSON parser,
// so user text in a name or description cannot inject markup.
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
