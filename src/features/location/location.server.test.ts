import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

import { createBreaker, withBreaker } from "@/lib/geocoding/breaker";
import { createNominatim } from "@/lib/geocoding/nominatim";

const { temp } = await vi.hoisted(async () => {
  const helper = await import("../../../tests/helpers/temp-database");
  return { temp: await helper.createTempDatabase("location") };
});
vi.mock("@/db/client.server", () => ({ db: temp?.db }));
vi.mock("@/env.server", () => ({ env: { GEOCODER_CONTACT: "test" } }));

const { acquireNominatim } = await import("./location.server");

afterAll(async () => {
  await temp?.drop();
});

describe.skipIf(!temp)("Nominatim slot queue", () => {
  it("a full local queue does not switch Nominatim off for later searches", async () => {
    const db = temp!.db;
    const fetcher = vi.fn(() => Promise.resolve(new Response("[]")));
    const nominatim = withBreaker(
      createNominatim({
        fetcher,
        userAgent: "test",
        acquire: acquireNominatim,
      }),
      createBreaker(),
    );
    await db.execute(sql`
      insert into usage_counter (key, window_start, count)
      values ('nominatim:slot', now() + interval '10 seconds', 0)`);
    await expect(
      nominatim.search({ text: "Ilica 1", countryCode: "HR" }),
    ).rejects.toMatchObject({ code: "busy" });

    await db.execute(
      sql`delete from usage_counter where key = 'nominatim:slot'`,
    );
    await nominatim.search({ text: "Ilica 1", countryCode: "HR" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
