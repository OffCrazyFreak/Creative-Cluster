import { createMiddleware } from "@tanstack/react-start";

import { ForbiddenError, UnauthorizedError } from "./errors";
import { readSession } from "./session.server";

// Every server function starts with exactly one of these (enforced by tests/guards.test.ts).

export const publicGuard = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await readSession({ fresh: false });
    return next({ context: { session } });
  },
);

export const memberGuard = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await readSession({ fresh: true });
    if (!session || session.user.banned) throw new UnauthorizedError();
    return next({ context: { session, user: session.user } });
  },
);

export const adminGuard = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await readSession({ fresh: true });
    if (!session || session.user.banned) throw new UnauthorizedError();
    if (session.user.role !== "admin") throw new ForbiddenError();
    return next({ context: { session, user: session.user } });
  },
);
