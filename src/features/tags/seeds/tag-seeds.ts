import type { ISiteConfig } from "@/sites/site-config-types";

import { DNZ_TAG_SEED } from "./dnz-seed";
import { RPCC_TAG_SEED } from "./rpcc-seed";
import type { ITagSeed } from "./seed-types";

export function tagSeedFor(name: ISiteConfig["tagSeed"]): readonly ITagSeed[] {
  return name === "esco" ? DNZ_TAG_SEED : RPCC_TAG_SEED;
}
