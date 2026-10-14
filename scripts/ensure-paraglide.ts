import { compile } from "@inlang/paraglide-js";

import { paraglideOptions } from "../src/sites/paraglide-options";
import { parseSiteId } from "../src/sites/site-id";

// Node scripts and tests import messages without Vite; compiling every run keeps copy edits current.
export async function ensureParaglide() {
  await compile(paraglideOptions(parseSiteId(process.env.VITE_SITE_ID), false));
}
