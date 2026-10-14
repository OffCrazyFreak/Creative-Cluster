// The user's text is matched literally: % and _ would otherwise act as wildcards in LIKE.
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
