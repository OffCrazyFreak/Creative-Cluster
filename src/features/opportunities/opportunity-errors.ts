// A rejection needs a reason code, and "other" needs a note.
export class OpportunityDecisionError extends Error {
  constructor() {
    super("An opportunity decision needs a reason");
    this.name = "OpportunityDecisionError";
  }
}

// The approved post's deadline is already over; the admin should reject it with a reason.
export class OpportunityDeadlinePassedError extends Error {
  constructor() {
    super("The deadline of this opportunity has passed");
    this.name = "OpportunityDeadlinePassedError";
  }
}

// The entry already has the most open posts; this one was not counted while it waited past its expiry.
export class OpportunityLimitError extends Error {
  constructor() {
    super("The entry has too many open opportunities to publish this one");
    this.name = "OpportunityLimitError";
  }
}
