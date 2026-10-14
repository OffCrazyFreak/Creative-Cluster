// Thrown when a save names something that does not exist (for example an image id nobody uploaded).
export class InvalidListingError extends Error {
  constructor() {
    super("Invalid listing data");
    this.name = "InvalidListingError";
  }
}
