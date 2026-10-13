// Deliberately broken: aliasing, double guards and a local look-alike guard must all be caught.
import { createMiddleware, createServerFn as fn } from "@tanstack/react-start";
import { z } from "zod";

import { adminGuard, publicGuard } from "@/server/guards";

const memberGuard = createMiddleware({ type: "function" }).server(({ next }) =>
  next(),
);

export const aliased = fn({ method: "POST" })
  .inputValidator(z.void())
  .handler(() => "secret");

export const doubled = fn()
  .middleware([publicGuard, adminGuard])
  .inputValidator(z.void())
  .handler(() => "secret");

export const faked = fn()
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(() => "secret");
