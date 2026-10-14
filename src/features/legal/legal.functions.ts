import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { LOCALES } from "@/constants/locales";
import { adminGuard, publicGuard } from "@/server/guards";

import { readLegalContent } from "./legal-content.server";
import { PUBLIC_LEGAL_PAGES } from "./legal-pages";

// The locale is passed in: a client-side navigation calls /_serverFn, whose URL carries no locale prefix.
export const getLegalContent = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(
    z.object({ page: z.enum(PUBLIC_LEGAL_PAGES), locale: z.enum(LOCALES) }),
  )
  .handler(({ data }) => readLegalContent(data.page, data.locale));

export const getAdminHelp = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.object({ locale: z.enum(LOCALES) }))
  .handler(({ data }) => readLegalContent("help-admin", data.locale));
