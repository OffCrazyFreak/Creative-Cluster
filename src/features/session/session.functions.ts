import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicGuard } from "@/server/guards";

export const getViewer = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(({ context }) => {
    if (!context.session) return null;
    const { id, name, email, role, locale } = context.session.user;
    return { id, name, email, role, locale };
  });
