export const TAG_STATUSES = ["active", "suggested", "rejected"] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

export const TAG_FIELDS = ["topic", "offering", "seeking"] as const;
export type TagField = (typeof TAG_FIELDS)[number];

export const MAX_TAGS_PER_FIELD = 5;
