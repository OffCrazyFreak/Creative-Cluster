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
