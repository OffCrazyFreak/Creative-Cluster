import { dnz } from "./dnz.ts";
import { rpcc } from "./rpcc.ts";
import type { ISiteConfig } from "./site-config-types.ts";
import type { SiteId } from "./site-id.ts";

export const SITE_CONFIGS: Record<SiteId, ISiteConfig> = { rpcc, dnz };
