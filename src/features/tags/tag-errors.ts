// Input the client should never send (too many tags, a tag the user may not use).
export class TagSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TagSelectionError";
  }
}
