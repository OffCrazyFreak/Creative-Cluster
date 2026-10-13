import type { EntryStatus } from "@/constants/entry";
import type { TagField } from "@/constants/tags";
import * as schema from "@/db/schema";

import type { ITempDatabase } from "./temp-database";

type Db = ITempDatabase["db"];

let counter = 0;

export async function addTag(
  db: Db,
  slug: string,
  extra: Partial<typeof schema.tag.$inferInsert> = {},
) {
  const [row] = await db
    .insert(schema.tag)
    .values({ slug, labelEn: slug, labelHr: `${slug}-hr`, ...extra })
    .returning();
  return row;
}

export async function addEntry(
  db: Db,
  name: string,
  tags: Partial<Record<TagField, string[]>> = {},
  extra: {
    status?: EntryStatus;
    matchingOptOut?: boolean;
    ownerUserId?: string;
  } = {},
) {
  counter += 1;
  const [row] = await db
    .insert(schema.entry)
    .values({
      slug: `${name.toLowerCase().replaceAll(" ", "-")}-${counter}`,
      name,
      kind: "organization",
      sourceLocale: "en",
      status: extra.status ?? "published",
      matchingOptOut: extra.matchingOptOut ?? false,
      ownerUserId: extra.ownerUserId,
    })
    .returning();
  const links = Object.entries(tags).flatMap(([field, ids]) =>
    (ids ?? []).map((tagId) => ({
      entryId: row.id,
      tagId,
      field: field as TagField,
    })),
  );
  if (links.length) await db.insert(schema.entryTag).values(links);
  return row;
}

export async function addUser(db: Db, name: string, role = "member") {
  counter += 1;
  const [row] = await db
    .insert(schema.user)
    .values({ name, email: `${name}-${counter}@example.test`, role })
    .returning();
  return row;
}
