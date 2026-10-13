export type RichTextErrorReason =
  | "invalid"
  | "too_large"
  | "too_deep"
  | "too_many_nodes"
  | "too_many_links"
  | "bad_link"
  | "too_long"
  | "bad_tags";

export class RichTextError extends Error {
  reason: RichTextErrorReason;

  constructor(reason: RichTextErrorReason) {
    super(`Invalid rich text: ${reason}`);
    this.name = "RichTextError";
    this.reason = reason;
  }
}
