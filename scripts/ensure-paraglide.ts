import { existsSync } from "node:fs";

import { compile } from "@inlang/paraglide-js";

import { paraglideOptions } from "../src/sites/paraglide-options";
import { parseSiteId } from "../src/sites/site-id";

// Node scripts and tests import messages without Vite, so compile them the way pnpm generate does.
export async function ensureParaglide() {
  if (existsSync("src/paraglide/messages.js")) return;
  await compile(paraglideOptions(parseSiteId(process.env.VITE_SITE_ID)));
}
