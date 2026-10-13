import { compile } from "@inlang/paraglide-js";

import { paraglideOptions } from "../src/sites/paraglide-options.ts";
import { parseSiteId } from "../src/sites/site-id.ts";

// Typecheck and lint need the generated Paraglide runtime before any Vite run.
await compile(paraglideOptions(parseSiteId(process.env.VITE_SITE_ID)));
