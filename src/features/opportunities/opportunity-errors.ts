// A rejection needs a reason code, and "other" needs a note.
export class OpportunityDecisionError extends Error {
  constructor() {
    super("An opportunity decision needs a reason");
    this.name = "OpportunityDecisionError";
  }
}
