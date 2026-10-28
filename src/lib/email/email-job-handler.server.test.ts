import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";

import { PermanentJobError } from "@/lib/jobs/job-registry.server";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("email_handler") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret", NODE_ENV: "test" },
}));
const sent = vi.hoisted(() => vi.fn());
vi.mock("./send-email.server", () => ({ sendEmail: sent }));
const { handleEmailJob } = await import("./email-job-handler.server");
const { suppressEmail } =
  await import("@/features/claims/email-suppression.server");

const props = {
  locale: "en" as const,
  entryName: "X",
  link: "l",
  removeLink: "r",
};

describe.skipIf(!temp)("email job handler", () => {
  afterAll(async () => {
    await temp?.drop();
  });

  it("refuses a claim mail to an address that opted out after the job was queued", async () => {
    await suppressEmail(temp!.db, "quiet@example.com", "claim_removal");
    const job = { id: "j", priority: 5, idempotencyKey: "k" } as never;
    await expect(
      handleEmailJob(
        {
          template: "claim_reminder",
          to: "Quiet@Example.com",
          props: { ...props, expiryDate: "d" },
        },
        job,
      ),
    ).rejects.toBeInstanceOf(PermanentJobError);
    expect(sent).not.toHaveBeenCalled();
  });

  it("refuses a contact mail to an address that opted out after the job was queued, and drops its text", async () => {
    await suppressEmail(temp!.db, "hushed@example.com", "claim_removal");
    const payload = {
      template: "contact" as const,
      to: "hushed@example.com",
      replyTo: "visitor@example.com",
      props: {
        locale: "en" as const,
        entryName: "X",
        senderName: "V",
        senderEmail: "visitor@example.com",
        messageText: "Hi",
        link: "l",
      },
    };
    const [row] = await temp!.db
      .insert(schema.job)
      .values({ type: "email", payload, idempotencyKey: "contact:k2" })
      .returning();
    await expect(handleEmailJob(payload, row as never)).rejects.toBeInstanceOf(
      PermanentJobError,
    );
    expect(sent).not.toHaveBeenCalled();
    const [after] = await temp!.db
      .select()
      .from(schema.job)
      .where(eq(schema.job.id, row.id));
    expect(after.payload).toEqual({ template: "contact" });
  });
});
