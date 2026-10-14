import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { LimitError, NotFoundError } from "@/server/errors";

import { addEntry, addTag, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";
import { seedTags } from "./seed-tags.server";
import { TagSelectionError } from "./tag-errors";
import { MAX_TAG_ALIASES } from "./tag-schemas";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("tags") };
});
// The services import the shared db client; point it at the throwaway database.
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { decideSuggestion } = await import("./decide-suggestion.server");
const { mergeTags } = await import("./merge-tags.server");
const { listPickerTags, getEntryTags } = await import("./tag-queries.server");
const { saveEntryTags } = await import("./save-entry-tags.server");
const { suggestTag, LOOKUPS_PER_HOUR, MAX_OPEN_SUGGESTIONS } =
  await import("./suggest-tag.server");

describe.skipIf(!temp)("tag services", () => {
  const { db } = temp as ITempDatabase;

  afterAll(async () => {
    await temp?.drop();
  });

  async function slugsFor(userId: string | null) {
    return (await listPickerTags({ userId })).map((t) => t.slug);
  }
  async function entryTagIds(
    entryId: string,
    field: "topic" | "offering" | "seeking",
  ) {
    return (
      await db
        .select({ tagId: schema.entryTag.tagId })
        .from(schema.entryTag)
        .where(
          and(
            eq(schema.entryTag.entryId, entryId),
            eq(schema.entryTag.field, field),
          ),
        )
    ).map((r) => r.tagId);
  }

  describe("seedTags", () => {
    it("is idempotent, links parents and keeps admin edits", async () => {
      const seed = [
        { slug: "music", labelEn: "Music", labelHr: "Glazba" },
        {
          slug: "music-live",
          labelEn: "Live music",
          labelHr: "Glazba uživo",
          parent: "music",
        },
      ];
      expect(await seedTags(db as never, seed)).toEqual({
        total: 2,
        inserted: 2,
      });
      await db
        .update(schema.tag)
        .set({ labelHr: "Muzika" })
        .where(eq(schema.tag.slug, "music"));
      expect(await seedTags(db as never, seed)).toEqual({
        total: 2,
        inserted: 0,
      });

      const rows = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.status, "active"));
      const parent = rows.find((r) => r.slug === "music");
      expect(parent?.labelHr).toBe("Muzika");
      expect(rows.find((r) => r.slug === "music-live")?.parentId).toBe(
        parent?.id,
      );
      const merged = await db
        .insert(schema.tag)
        .values({
          slug: "ghost",
          labelEn: "Ghost",
          labelHr: "Duh",
          canonicalId: parent!.id,
        })
        .returning();
      await seedTags(db, [
        { slug: "ghost-child", labelEn: "G", labelHr: "G", parent: "ghost" },
      ]);
      const [orphan] = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.slug, "ghost-child"));
      expect(orphan.parentId).toBeNull();
      expect(merged).toHaveLength(1);
      await db.delete(schema.tag);
    });
  });

  describe("suggestions and entry tags", () => {
    let owner: { id: string };
    let other: { id: string };
    let ownEntry: { id: string };
    let activeTag: { id: string };

    beforeAll(async () => {
      owner = await addUser(db, "owner");
      other = await addUser(db, "other");
      ownEntry = await addEntry(db, "Own", {}, { ownerUserId: owner.id });
      activeTag = await addTag(db, "welding");
    });

    it("creates a suggestion visible to its author only, with a review item and log", async () => {
      const { tag, created } = await suggestTag({
        userId: owner.id,
        label: "Glassblowing",
        locale: "en",
      });
      expect(created).toBe(true);
      expect(tag).toMatchObject({ slug: "glassblowing", status: "suggested" });
      expect(await slugsFor(owner.id)).toContain("glassblowing");
      expect(await slugsFor(other.id)).not.toContain("glassblowing");
      expect(await slugsFor(null)).not.toContain("glassblowing");

      const items = await db
        .select()
        .from(schema.reviewItem)
        .where(eq(schema.reviewItem.entityId, tag.id));
      expect(items).toMatchObject([{ type: "tag", status: "open" }]);
      const logs = await db
        .select()
        .from(schema.changeLog)
        .where(eq(schema.changeLog.entityId, tag.id));
      expect(logs).toMatchObject([
        { entityType: "tag", action: "create", source: "owner" },
      ]);
    });

    it("returns the existing tag for a label it already knows, accents ignored", async () => {
      const { tag, created } = await suggestTag({
        userId: owner.id,
        label: "WELDING",
        locale: "en",
      });
      expect(created).toBe(false);
      expect(tag.id).toBe(activeTag.id);
    });

    it("lets the author use the suggestion on their own entry, but nobody else", async () => {
      const mine = (await listPickerTags({ userId: owner.id })).find(
        (t) => t.slug === "glassblowing",
      );
      await saveEntryTags({
        entryId: ownEntry.id,
        field: "offering",
        tagIds: [mine!.id, activeTag.id],
        actor: { userId: owner.id, isAdmin: false },
      });
      expect((await entryTagIds(ownEntry.id, "offering")).sort()).toEqual(
        [mine!.id, activeTag.id].sort(),
      );

      const othersEntry = await addEntry(
        db,
        "Others",
        {},
        { ownerUserId: other.id },
      );
      await expect(
        saveEntryTags({
          entryId: othersEntry.id,
          field: "offering",
          tagIds: [mine!.id],
          actor: { userId: other.id, isAdmin: false },
        }),
      ).rejects.toBeInstanceOf(TagSelectionError);
    });

    it("replaces a field, logs the change and skips a no-op save", async () => {
      const logsBefore = await db
        .select()
        .from(schema.changeLog)
        .where(eq(schema.changeLog.entityId, ownEntry.id));
      const result = await saveEntryTags({
        entryId: ownEntry.id,
        field: "topic",
        tagIds: [activeTag.id],
        actor: { userId: owner.id, isAdmin: false },
      });
      expect(result.changed).toBe(true);
      const again = await saveEntryTags({
        entryId: ownEntry.id,
        field: "topic",
        tagIds: [activeTag.id],
        actor: { userId: owner.id, isAdmin: false },
      });
      expect(again.changed).toBe(false);
      const logsAfter = await db
        .select()
        .from(schema.changeLog)
        .where(eq(schema.changeLog.entityId, ownEntry.id));
      expect(logsAfter.length - logsBefore.length).toBe(1);
      expect(logsAfter.at(-1)).toMatchObject({
        entityType: "entry",
        changedFields: ["tags_topic"],
      });
    });

    it("rejects entries that are not yours and more than five tags", async () => {
      await expect(
        saveEntryTags({
          entryId: ownEntry.id,
          field: "topic",
          tagIds: [],
          actor: { userId: other.id, isAdmin: false },
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
      const many = await Promise.all(
        Array.from({ length: 6 }, (_, i) => addTag(db, `many-${i}`)),
      );
      await expect(
        saveEntryTags({
          entryId: ownEntry.id,
          field: "topic",
          tagIds: many.map((t) => t.id),
          actor: { userId: owner.id, isAdmin: false },
        }),
      ).rejects.toBeInstanceOf(TagSelectionError);
    });

    it("caps open suggestions per account", async () => {
      const spammer = await addUser(db, "spammer");
      for (let i = 0; i < MAX_OPEN_SUGGESTIONS; i += 1) {
        await suggestTag({
          userId: spammer.id,
          label: `Spam tag ${i}`,
          locale: "en",
        });
      }
      await expect(
        suggestTag({ userId: spammer.id, label: "One more", locale: "en" }),
      ).rejects.toThrow("Too many requests");
    });

    it("approval shows the tag to everyone and closes the review item", async () => {
      const admin = await addUser(db, "admin", "admin");
      const { tag } = await suggestTag({
        userId: owner.id,
        label: "Kiln firing",
        locale: "en",
      });
      await decideSuggestion({
        tagId: tag.id,
        decision: "approve",
        adminId: admin.id,
      });
      expect(await slugsFor(other.id)).toContain("kiln-firing");
      const [item] = await db
        .select()
        .from(schema.reviewItem)
        .where(eq(schema.reviewItem.entityId, tag.id));
      expect(item).toMatchObject({ status: "approved", decidedBy: admin.id });
    });

    it("rejection strips the tag from the suggester's entry", async () => {
      const admin = await addUser(db, "admin2", "admin");
      const { tag } = await suggestTag({
        userId: owner.id,
        label: "Nonsense",
        locale: "en",
      });
      await saveEntryTags({
        entryId: ownEntry.id,
        field: "seeking",
        tagIds: [tag.id],
        actor: { userId: owner.id, isAdmin: false },
      });
      await decideSuggestion({
        tagId: tag.id,
        decision: "reject",
        adminId: admin.id,
      });
      expect(await entryTagIds(ownEntry.id, "seeking")).toEqual([]);
      expect(await slugsFor(owner.id)).not.toContain("nonsense");
    });
  });

  describe("review fixes", () => {
    it("lets an admin see and keep a member's pending suggestion", async () => {
      const member = await addUser(db, "m1");
      const admin = await addUser(db, "a1", "admin");
      const entryRow = await addEntry(
        db,
        "M1 entry",
        {},
        { ownerUserId: member.id },
      );
      const { tag } = await suggestTag({
        userId: member.id,
        label: "Pending thing",
        locale: "en",
      });
      await saveEntryTags({
        entryId: entryRow.id,
        field: "topic",
        tagIds: [tag.id],
        actor: { userId: member.id, isAdmin: false },
      });
      const adminView = { userId: admin.id, isAdmin: true };
      expect((await listPickerTags(adminView)).map((t) => t.id)).toContain(
        tag.id,
      );
      expect((await getEntryTags(entryRow.id, adminView)).topic).toHaveLength(
        1,
      );
      await saveEntryTags({
        entryId: entryRow.id,
        field: "topic",
        tagIds: [tag.id],
        actor: adminView,
      });
      expect(await entryTagIds(entryRow.id, "topic")).toEqual([tag.id]);
    });

    it("hides the tags of an unpublished entry from strangers", async () => {
      const member = await addUser(db, "m2");
      const t = await addTag(db, "draft-visible");
      const draft = await addEntry(
        db,
        "Draft entry",
        { topic: [t.id] },
        { status: "draft", ownerUserId: member.id },
      );
      expect((await getEntryTags(draft.id, { userId: null })).topic).toEqual(
        [],
      );
      expect(
        (await getEntryTags(draft.id, { userId: member.id })).topic,
      ).toHaveLength(1);
      expect(
        (await getEntryTags(draft.id, { userId: null, isAdmin: true })).topic,
      ).toHaveLength(1);
    });

    it("gives symbol-only suggestions a tag slug and resolves slug collisions", async () => {
      const member = await addUser(db, "m3");
      const [a, b, c] = await Promise.all([
        suggestTag({ userId: member.id, label: "!!!", locale: "en" }),
        suggestTag({ userId: member.id, label: "Fizz?", locale: "en" }),
        suggestTag({ userId: member.id, label: "fizz!", locale: "en" }),
      ]);
      expect(a.tag.slug).toBe("tag");
      expect([b.tag.slug, c.tag.slug].sort()).toEqual(["fizz", "fizz-2"]);
    });

    it("does not rate limit picking a label that already exists", async () => {
      const picker = await addUser(db, "picker");
      await addTag(db, "pottery");
      for (let i = 0; i < 35; i += 1) {
        const { created } = await suggestTag({
          userId: picker.id,
          label: "Pottery",
          locale: "en",
        });
        expect(created).toBe(false);
      }
      await expect(
        suggestTag({ userId: picker.id, label: "Bookbinding", locale: "en" }),
      ).resolves.toMatchObject({ created: true });
    });

    it("caps label lookups at a loose hourly ceiling", async () => {
      const looper = await addUser(db, "looper");
      await addTag(db, "loomweaving");
      for (let i = 0; i < LOOKUPS_PER_HOUR; i += 1) {
        await suggestTag({
          userId: looper.id,
          label: "Loomweaving",
          locale: "en",
        });
      }
      await expect(
        suggestTag({ userId: looper.id, label: "Loomweaving", locale: "en" }),
      ).rejects.toBeInstanceOf(LimitError);
    });

    it("counts refused new suggestions toward the hourly limit", async () => {
      const admin = await addUser(db, "admin-hourly", "admin");
      const eager = await addUser(db, "eager");
      const first = await suggestTag({
        userId: eager.id,
        label: "Eager 0",
        locale: "en",
      });
      for (let i = 1; i < 30; i += 1) {
        const attempt = suggestTag({
          userId: eager.id,
          label: `Eager ${i}`,
          locale: "en",
        });
        if (i < MAX_OPEN_SUGGESTIONS) await attempt;
        else await expect(attempt).rejects.toBeInstanceOf(LimitError);
      }
      await decideSuggestion({
        tagId: first.tag.id,
        decision: "reject",
        adminId: admin.id,
      });
      await expect(
        suggestTag({ userId: eager.id, label: "Eager more", locale: "en" }),
      ).rejects.toThrow("Too many requests");
    });

    it("cannot exceed the suggestion cap with parallel requests", async () => {
      const member = await addUser(db, "m4");
      const results = await Promise.allSettled(
        Array.from({ length: MAX_OPEN_SUGGESTIONS + 3 }, (_, i) =>
          suggestTag({
            userId: member.id,
            label: `Parallel ${i}`,
            locale: "en",
          }),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(
        MAX_OPEN_SUGGESTIONS,
      );
    });

    it("logs the entry, opportunity and tag changes of a rejection and a merge", async () => {
      const admin = await addUser(db, "a2", "admin");
      const member = await addUser(db, "m5");
      const entryRow = await addEntry(
        db,
        "Logged",
        {},
        { ownerUserId: member.id },
      );
      const { tag: bad } = await suggestTag({
        userId: member.id,
        label: "Bad tag",
        locale: "en",
      });
      await saveEntryTags({
        entryId: entryRow.id,
        field: "seeking",
        tagIds: [bad.id],
        actor: { userId: member.id, isAdmin: false },
      });
      await decideSuggestion({
        tagId: bad.id,
        decision: "reject",
        adminId: admin.id,
      });
      const logs = await db
        .select()
        .from(schema.changeLog)
        .where(eq(schema.changeLog.entityId, entryRow.id));
      expect(logs.at(-1)).toMatchObject({
        source: "admin",
        before: { tags_seeking: ["bad-tag"] },
        after: { tags_seeking: [] },
      });

      const keep = await addTag(db, "keep-log");
      const gone = await addTag(db, "gone-log");
      const e2 = await addEntry(db, "Logged 2", { offering: [gone.id] });
      await mergeTags({
        sourceId: gone.id,
        targetId: keep.id,
        adminId: admin.id,
      });
      const entryLogs = await db
        .select()
        .from(schema.changeLog)
        .where(eq(schema.changeLog.entityId, e2.id));
      expect(entryLogs).toMatchObject([
        {
          before: { tags_offering: ["gone-log"] },
          after: { tags_offering: ["keep-log"] },
        },
      ]);
      const tagLogs = await db
        .select()
        .from(schema.changeLog)
        .where(eq(schema.changeLog.entityId, keep.id));
      expect(tagLogs).toHaveLength(1);
    });
  });

  describe("mergeTags", () => {
    it("repoints usage, carries aliases and children, and survives overlap", async () => {
      const admin = await addUser(db, "mergeadmin", "admin");
      const keep = await addTag(db, "ceramics", {
        labelEn: "Ceramics",
        labelHr: "Keramika",
        aliasesEn: ["pottery"],
      });
      const dupe = await addTag(db, "clay-work", {
        labelEn: "Clay work",
        labelHr: "Rad s glinom",
        aliasesEn: ["clay"],
      });
      const child = await addTag(db, "raku", { parentId: dupe.id });
      const both = await addEntry(db, "Both", {
        offering: [keep.id, dupe.id],
        topic: [dupe.id],
      });
      const onlyDupe = await addEntry(db, "Only dupe", { seeking: [dupe.id] });
      const [opp] = await db
        .insert(schema.opportunity)
        .values({
          entryId: onlyDupe.id,
          type: "seeking",
          category: "skill",
          title: "Kiln help",
          body: { type: "doc", content: [] } as never,
          sourceLocale: "en",
          expiresAt: new Date(Date.now() + 864e5),
        })
        .returning();
      await db
        .insert(schema.opportunityTag)
        .values([{ opportunityId: opp.id, tagId: dupe.id }]);

      await mergeTags({
        sourceId: dupe.id,
        targetId: keep.id,
        adminId: admin.id,
      });

      expect(await entryTagIds(both.id, "offering")).toEqual([keep.id]);
      expect(await entryTagIds(both.id, "topic")).toEqual([keep.id]);
      expect(await entryTagIds(onlyDupe.id, "seeking")).toEqual([keep.id]);
      const oppTags = await db
        .select()
        .from(schema.opportunityTag)
        .where(eq(schema.opportunityTag.opportunityId, opp.id));
      expect(oppTags.map((r) => r.tagId)).toEqual([keep.id]);

      const [target] = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.id, keep.id));
      expect(target.aliasesEn.sort()).toEqual(["Clay work", "clay", "pottery"]);
      expect(target.aliasesHr).toEqual(["Rad s glinom"]);
      const [source] = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.id, dupe.id));
      expect(source.canonicalId).toBe(keep.id);
      const [movedChild] = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.id, child.id));
      expect(movedChild.parentId).toBe(keep.id);
      expect(await slugsFor(null)).not.toContain("clay-work");
    });

    it("caps carried-over aliases at the edit limit", async () => {
      const admin = await addUser(db, "a3", "admin");
      const keep = await addTag(db, "cap-keep", {
        aliasesEn: Array.from({ length: 20 }, (_, i) => `keep alias ${i}`),
      });
      const gone = await addTag(db, "cap-gone", {
        labelEn: "Cap gone",
        aliasesEn: Array.from({ length: 20 }, (_, i) => `gone alias ${i}`),
      });
      await mergeTags({
        sourceId: gone.id,
        targetId: keep.id,
        adminId: admin.id,
      });
      const [row] = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.id, keep.id));
      expect(row.aliasesEn).toHaveLength(MAX_TAG_ALIASES);
      expect(row.aliasesEn).toContain("Cap gone");
    });

    it("refuses a merge that would nest tags two levels deep", async () => {
      const admin = await addUser(db, "a4", "admin");
      const root = await addTag(db, "nest-root");
      const parent = await addTag(db, "nest-parent");
      await addTag(db, "nest-child", { parentId: parent.id });
      const deep = await addTag(db, "nest-deep", { parentId: root.id });
      await expect(
        mergeTags({
          sourceId: parent.id,
          targetId: deep.id,
          adminId: admin.id,
        }),
      ).rejects.toBeInstanceOf(TagSelectionError);
    });

    it("flattens when a parent is merged into its own child", async () => {
      const admin = await addUser(db, "a5", "admin");
      const parent = await addTag(db, "flat-parent");
      const child = await addTag(db, "flat-child", { parentId: parent.id });
      const sibling = await addTag(db, "flat-sibling", { parentId: parent.id });
      await mergeTags({
        sourceId: parent.id,
        targetId: child.id,
        adminId: admin.id,
      });
      const rows = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.id, sibling.id));
      expect(rows[0].parentId).toBe(child.id);
      const [target] = await db
        .select()
        .from(schema.tag)
        .where(eq(schema.tag.id, child.id));
      expect(target.parentId).toBeNull();
    });

    it("refuses a self merge and a merged target", async () => {
      const admin = await addUser(db, "mergeadmin2", "admin");
      const a = await addTag(db, "a-tag");
      const b = await addTag(db, "b-tag");
      await expect(
        mergeTags({ sourceId: a.id, targetId: a.id, adminId: admin.id }),
      ).rejects.toBeInstanceOf(TagSelectionError);
      await mergeTags({ sourceId: a.id, targetId: b.id, adminId: admin.id });
      await expect(
        mergeTags({ sourceId: b.id, targetId: a.id, adminId: admin.id }),
      ).rejects.toBeInstanceOf(TagSelectionError);
    });
  });
});
