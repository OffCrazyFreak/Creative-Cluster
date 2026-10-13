export const SITE_IDS = ["rpcc", "dnz"] as const;

export type SiteId = (typeof SITE_IDS)[number];

export function parseSiteId(value: string | undefined): SiteId {
  const id = value ?? "rpcc";
  if (!SITE_IDS.includes(id as SiteId)) {
    throw new Error(`VITE_SITE_ID must be one of ${SITE_IDS.join(", ")}`);
  }
  return id as SiteId;
}
