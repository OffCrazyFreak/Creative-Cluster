// Thrown by guards and services; "missing" and "not yours" share NotFound on purpose.
export class NotFoundError extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export class LimitError extends Error {
  constructor() {
    super("Too many requests");
    this.name = "LimitError";
  }
}
