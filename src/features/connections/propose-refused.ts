import type { ProposeError } from "./connections-schemas";

// Thrown inside the transaction so everything done so far (such as a new stub entry) rolls back.
export class ProposeRefused extends Error {
  constructor(readonly code: ProposeError) {
    super(code);
  }
}
