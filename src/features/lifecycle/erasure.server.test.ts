import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import { ERASURE_MARKER_PREFIX } from "@/constants/lifecycle";
import * as schema from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import type { ITempDatabase } from "../../../tests/helpers/temp-database";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("erasure") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const erasure = await import("./erasure.server");
const exporter = await import("./export-data.server");
const scheduled = await import("./scheduled-lifecycle.server");
const { purgeErasedUser } = await import("./purge-erased-user.server");

describe.skipIf(!temp)("erasure and export", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  async function owner(name: string) {
    const account = await addUser(db, name);
    const listing = await addEntry(
      db,
      `${name} listing`,
      {},
      { ownerUserId: account.id },
    );
    return { account, listing };
  }
  async function backdate(userId: string, days: number) {
    await db
      .update(schema.verification)
      .set({ createdAt: new Date(Date.now() - days * 86_400_000) })
      .where(
        eq(schema.verification.identifier, `${ERASURE_MARKER_PREFIX}${userId}`),
      );
  }
  async function entryOf(id: string) {
    return (
      await db.select().from(schema.entry).where(eq(schema.entry.id, id))
    )[0];
  }

  it("archives at once, mails the owner and can be cancelled", async () => {
    const { account, listing } = await owner("Cancel");
    const state = await erasure.requestErasure(account.id);
    expect(state.scheduledFor).toBeTruthy();
    const archived = await entryOf(listing.id);
    expect(archived.status).toBe("archived");
    expect(archived.erasureRequestedAt).not.toBeNull();
    // Asking twice keeps the first date and sends one mail.
    expect((await erasure.requestErasure(account.id)).scheduledFor).toBe(
      state.scheduledFor,
    );
    const mails = (await db.select().from(schema.job))
      .map((j) => j.payload as { template: string; to: string })
      .filter(
        (p) => p.template === "erasure_scheduled" && p.to === account.email,
      );
    expect(mails).toHaveLength(1);

    await erasure.cancelErasure(account.id);
    const back = await entryOf(listing.id);
    expect(back.status).toBe("published");
    expect(back.erasureRequestedAt).toBeNull();
    expect((await erasure.getErasureState(account.id)).scheduledFor).toBeNull();
  });

  it("cancelling keeps a listing hidden that the owner had archived before", async () => {
    const { account, listing } = await owner("Was Hidden");
    await db
      .update(schema.entry)
      .set({ status: "archived" })
      .where(eq(schema.entry.id, listing.id));
    await erasure.requestErasure(account.id);
    await erasure.cancelErasure(account.id);
    expect((await entryOf(listing.id)).status).toBe("archived");
  });

  it("cancelling puts a pending application back in the queue", async () => {
    const { account, listing } = await owner("Was Pending");
    await db
      .update(schema.entry)
      .set({ status: "pending" })
      .where(eq(schema.entry.id, listing.id));
    await erasure.requestErasure(account.id);
    await erasure.cancelErasure(account.id);
    expect((await entryOf(listing.id)).status).toBe("pending");
  });

  it("does nothing before the grace period is over", async () => {
    const { account, listing } = await owner("Not Yet");
    await erasure.requestErasure(account.id);
    expect(
      await purgeErasedUser({ id: account.id, email: account.email }),
    ).toBe(false);
    expect(await entryOf(listing.id)).toBeDefined();
  });

  it("purges listing data, strips identifiers and deletes the account after 14 days", async () => {
    const { account, listing } = await owner("Purge Me");
    const [shared] = await db
      .insert(schema.image)
      .values({
        bytes: Buffer.from("x"),
        mime: "image/webp",
        width: 1,
        height: 1,
        size: 1,
        contentHash: "h1",
      })
      .returning();
    const [kept] = await db
      .insert(schema.image)
      .values({
        bytes: Buffer.from("y"),
        mime: "image/webp",
        width: 1,
        height: 1,
        size: 1,
        contentHash: "h2",
      })
      .returning();
    const other = await addEntry(db, "Uses Shared Image");
    await db
      .update(schema.entry)
      .set({ logoImageId: shared.id })
      .where(eq(schema.entry.id, other.id));
    await db
      .update(schema.entry)
      .set({ logoImageId: shared.id, coverImageId: kept.id })
      .where(eq(schema.entry.id, listing.id));
    await db.insert(schema.translation).values({
      entityType: "entry",
      entityId: listing.id,
      field: "description",
      locale: "hr",
      text: "t",
      origin: "machine",
      sourceHash: "s",
    });
    await writeChange(db, {
      entityType: "entry",
      entityId: listing.id,
      userId: account.id,
      source: "owner",
      action: "update",
      before: { contactEmail: "me@example.test", name: "a" },
      after: { contactEmail: "me2@example.test", name: "b" },
    });
    await db.insert(schema.job).values({
      type: "email",
      payload: { template: "invite", to: account.email, props: {} },
      status: "done",
    });
    await db
      .update(schema.entry)
      .set({ contactEmail: "contact-line@example.test" })
      .where(eq(schema.entry.id, listing.id));
    await db.insert(schema.job).values({
      type: "email",
      payload: {
        template: "rejected",
        to: "contact-line@example.test",
        props: {},
      },
      status: "done",
    });

    await erasure.requestErasure(account.id);
    await backdate(account.id, 15);
    expect(await scheduled.deleteDueErasedAccounts()).toBe(1);

    expect(await entryOf(listing.id)).toBeUndefined();
    expect(
      await db.select().from(schema.user).where(eq(schema.user.id, account.id)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(schema.translation)
        .where(eq(schema.translation.entityId, listing.id)),
    ).toHaveLength(0);
    // The image another listing still uses stays; the one nobody uses is gone.
    expect(
      await db
        .select({ id: schema.image.id })
        .from(schema.image)
        .where(eq(schema.image.id, shared.id)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: schema.image.id })
        .from(schema.image)
        .where(eq(schema.image.id, kept.id)),
    ).toHaveLength(0);
    const [log] = await db
      .select()
      .from(schema.changeLog)
      .where(eq(schema.changeLog.entityId, listing.id));
    expect(log.userId).toBeNull();
    expect(log.before).toBeNull();

    const jobs = (await db.select().from(schema.job)).map(
      (j) => j.payload as { template: string; to?: string; scrubbed?: boolean },
    );
    expect(jobs).toContainEqual(
      expect.objectContaining({ template: "erasure_done", to: account.email }),
    );
    expect(
      jobs.filter((j) => j.to === account.email && j.template === "invite"),
    ).toHaveLength(0);
    expect(
      jobs.filter((j) => j.to === "contact-line@example.test"),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(schema.verification)
        .where(
          eq(
            schema.verification.identifier,
            `${ERASURE_MARKER_PREFIX}${account.id}`,
          ),
        ),
    ).toHaveLength(0);
  });

  it("exports only the account's own data", async () => {
    const mine = await owner("Exporter");
    const theirs = await owner("Bystander");
    const [first, second] = [mine.listing.id, theirs.listing.id].sort();
    await db.insert(schema.link).values({
      fromId: first,
      toId: second,
      kind: "collaborated",
      symmetric: true,
      status: "confirmed",
      note: "shared project",
    });
    await writeChange(db, {
      entityType: "entry",
      entityId: theirs.listing.id,
      userId: theirs.account.id,
      source: "owner",
      action: "update",
      before: { name: "x" },
      after: { name: "y" },
    });
    await db.insert(schema.reviewItem).values({
      type: "report",
      entityType: "entry",
      entityId: mine.listing.id,
      payload: { reason: "spam", message: "reporter detail" },
    });

    const data = await exporter.exportUserData(mine.account.id);
    const text = JSON.stringify(data);
    expect(text).toContain("Exporter listing");
    expect(text).toContain(mine.account.email);
    expect(text).not.toContain(theirs.account.email);
    expect(text).not.toContain("reporter detail");
    expect(data.connections).toHaveLength(1);
    expect(data.changes.every((c) => c.entityId === mine.listing.id)).toBe(
      true,
    );
  });

  it("refuses to cancel once the grace period is over", async () => {
    const { account } = await owner("Too Late");
    await erasure.requestErasure(account.id);
    await backdate(account.id, 15);
    await expect(erasure.cancelErasure(account.id)).rejects.toThrow(
      "Not found",
    );
  });

  it("refuses an erasure request from the last admins", async () => {
    const lone = await addUser(db, "Lone", "admin");
    // Only an admin with a sign-in method counts, and asking for erasure needs a sign-in anyway.
    await db.insert(schema.account).values({
      accountId: lone.id,
      providerId: "credential",
      userId: lone.id,
      password: "hash",
    });
    const listing = await addEntry(
      db,
      "Admin listing",
      {},
      { ownerUserId: lone.id },
    );
    await expect(erasure.requestErasure(lone.id)).rejects.toThrow();
    expect((await entryOf(listing.id)).status).toBe("published");
    expect((await erasure.getErasureState(lone.id)).scheduledFor).toBeNull();
  });

  it("exports connections without hidden listings or the other side's words", async () => {
    const mine = await owner("Link Owner");
    const hidden = await addEntry(
      db,
      "Hidden Partner",
      {},
      { status: "suspended" },
    );
    const open = await addEntry(db, "Open Partner");
    const [a, b] = [mine.listing.id, hidden.id].sort();
    await db.insert(schema.link).values([
      {
        fromId: a,
        toId: b,
        kind: "collaborated",
        symmetric: true,
        status: "confirmed",
        note: "their note",
        proposedByEntryId: hidden.id,
      },
      {
        fromId: mine.listing.id,
        toId: open.id,
        kind: "supplier",
        symmetric: false,
        status: "confirmed",
        note: "my note",
        proposedByEntryId: mine.listing.id,
      },
    ]);
    const data = await exporter.exportUserData(mine.account.id);
    const text = JSON.stringify(data);
    expect(text).not.toContain("Hidden Partner");
    expect(text).not.toContain("their note");
    expect(text).toContain("Open Partner");
    expect(text).toContain("my note");
  });
});
