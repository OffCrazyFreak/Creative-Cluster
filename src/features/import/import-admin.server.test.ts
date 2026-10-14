import { afterAll, describe, expect, it, vi } from "vitest";

import { org, stagingFile } from "./import-fixtures";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("import_admin") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
const { previewStagingFile } = await import("./import-admin.server");

describe.skipIf(!temp)("admin import service", () => {
  afterAll(async () => {
    await temp?.drop();
  });

  it("reports invalid JSON and a wrong-site file without a plan", async () => {
    expect(await previewStagingFile("{oops")).toMatchObject({
      ok: false,
      error: "invalid_json",
    });
    const other = JSON.stringify(stagingFile([org("1", "Alpha")], "dnz"));
    expect(await previewStagingFile(other)).toMatchObject({
      ok: false,
      error: "wrong_site",
    });
  });

  it("lists field paths only, never the values, capped at ten", async () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      org(`id${i}`, "X", { contactEmail: "secret@example.com" }),
    );
    const result = await previewStagingFile(JSON.stringify(stagingFile(rows)));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_file");
    expect(result.issues).toHaveLength(10);
    expect(JSON.stringify(result.issues)).not.toContain("secret");
  });

  it("previews a valid file", async () => {
    const result = await previewStagingFile(
      JSON.stringify(stagingFile([org("1", "Alpha Studio")])),
    );
    expect(result).toMatchObject({ ok: true, plan: { total: 1 } });
  });
});
