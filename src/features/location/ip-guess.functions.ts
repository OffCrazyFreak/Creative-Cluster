import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { publicGuard } from "@/server/guards";

import { readIpGuess } from "./ip-guess.server";

// Called from the browser after hydration, never in a loader, so cached HTML never carries one
// visitor's guess; the response is private for the same reason.
export const ipGuessFn = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(() => {
    setResponseHeader("Cache-Control", "private, no-store");
    return readIpGuess();
  });
