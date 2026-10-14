import * as schema from "@/db/schema";
import type { RichTextDoc } from "@/typings/rich-text";

import type { ITempDatabase } from "./temp-database";

type Db = ITempDatabase["db"];

const EMPTY_BODY: RichTextDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Body" }] }],
};

export async function addOpportunity(
  db: Db,
  entryId: string,
  overrides: Partial<typeof schema.opportunity.$inferInsert> = {},
) {
  const values: typeof schema.opportunity.$inferInsert = {
    entryId,
    type: "seeking",
    category: "partner",
    title: "Need a partner",
    body: EMPTY_BODY,
    bodyText: "Body",
    sourceLocale: "en",
    expiresAt: new Date(Date.now() + 60 * 86_400_000),
    status: "pending",
    ...overrides,
  };
  const [row] = await db.insert(schema.opportunity).values(values).returning();
  return row;
}
