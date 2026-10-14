import { z } from "zod";

import { getLocale } from "@/paraglide/runtime";

const hr = z.locales.hr().localeError;
const en = z.locales.en().localeError;

// Fields without a custom Paraglide message fall back to Zod's own text in the request's language.
z.config({
  localeError: (issue) => (getLocale() === "hr" ? hr(issue) : en(issue)),
});
