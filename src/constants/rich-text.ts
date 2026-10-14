export const RICH_TEXT_MAX_BYTES = 60_000;
// Counts nodes from doc down to the text leaf; nine nested list levels fit. The editor enforces the same cap (depth-limit.ts).
export const RICH_TEXT_MAX_DEPTH = 20;
export const RICH_TEXT_MAX_NODES = 4_000;
export const RICH_TEXT_MAX_LINKS = 50;
export const RICH_TEXT_MAX_HREF_LENGTH = 2_000;

// Shared with the editor schema in src/lib/rich-text/extensions.ts.
export const RICH_TEXT_HEADING_LEVELS = [2, 3] as const;

export const RICH_TEXT_LINK_REL = "nofollow ugc noopener noreferrer";
