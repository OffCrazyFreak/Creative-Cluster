import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("notices") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/lib/jobs/trigger-drain.server", () => ({
  triggerDrain: () => Promise.resolve(),
}));

const { enqueueTermsNotice, countTermsRecipients } =
  await import("./enqueue-terms-notice.server");
const { sendBlockedNotice } =
  await import("@/features/admin-users/blocked-notice.server");
const db = temp!.db;

async function addPerson(email: string, locale: "en" | "hr", banned = false) {
  const [row] = await db
    .insert(schema.user)
    .values({
      name: `Person ${email}`,
      email,
      emailVerified: true,
      locale,
      banned,
    })
    .returning();
  return row;
}

beforeEach(async () => {
  await db.delete(schema.job);
  await db.delete(schema.user);
});
afterAll(() => temp?.drop());

describe("terms notice", () => {
  const notice = {
    effectiveDate: "2027-01-01",
    summary: { en: "English summary", hr: "Hrvatski sažetak" },
  };

  it("queues one localized mail per active user and skips blocked ones", async () => {
    await addPerson("a@example.org", "en");
    await addPerson("b@example.org", "hr");
    await addPerson("c@example.org", "en", true);
    expect(await countTermsRecipients()).toBe(2);
    expect(await enqueueTermsNotice(notice)).toBe(2);
    const jobs = await db.select().from(schema.job);
    const byTo = Object.fromEntries(
      jobs.map((j) => [
        (j.payload as { to: string }).to,
        (j.payload as { props: { summary: string; effectiveDate: string } })
          .props,
      ]),
    );
    expect(Object.keys(byTo).sort()).toEqual([
      "a@example.org",
      "b@example.org",
    ]);
    expect(byTo["b@example.org"]?.summary).toBe("Hrvatski sažetak");
    expect(byTo["a@example.org"]?.effectiveDate).toBe("January 1, 2027");
  });

  it("is a no-op when the same notice runs twice", async () => {
    await addPerson("a@example.org", "en");
    await enqueueTermsNotice(notice);
    await enqueueTermsNotice(notice);
    expect(await db.select().from(schema.job)).toHaveLength(1);
  });
});

describe("blocked notice", () => {
  it("queues an urgent mail with the reason in the user's language", async () => {
    const person = await addPerson("d@example.org", "hr");
    await sendBlockedNotice(person.id, "Spam");
    const [queued] = await db
      .select()
      .from(schema.job)
      .where(eq(schema.job.type, "email"));
    expect(queued?.priority).toBe(1);
    expect(queued?.payload).toMatchObject({
      template: "blocked",
      to: "d@example.org",
      props: { locale: "hr", reason: "Spam" },
    });
  });

  it("does nothing for an unknown user", async () => {
    await sendBlockedNotice("018f0000-0000-7000-8000-000000000000", "x");
    expect(await db.select().from(schema.job)).toHaveLength(0);
  });
});
