import { describe, expect, it, vi } from "vitest";

import { createBreaker, withBreaker } from "../../src/lib/geocoding/breaker";
import {
  reverseChain,
  searchChain,
  suggestChain,
} from "../../src/lib/geocoding/chain";
import {
  GeocodeError,
  type GeocodeErrorCode,
} from "../../src/lib/geocoding/errors";
import { getJson } from "../../src/lib/geocoding/http";
import { createPhoton } from "../../src/lib/geocoding/photon";
import type { GeoHit, Geocoder } from "../../src/lib/geocoding/types";

const HIT: GeoHit = {
  label: "Ilica 1",
  secondary: "Zagreb",
  lat: 45.8,
  lng: 15.9,
  city: "Zagreb",
  countryCode: "HR",
  precision: "house",
  source: "photon",
};

function adapter(
  id: Geocoder["id"],
  search: Geocoder["search"],
  covers?: Geocoder["covers"],
): Geocoder {
  return {
    id,
    covers,
    suggest: search,
    search,
    reverse: () => Promise.resolve(null),
  };
}
function failing(code: GeocodeErrorCode) {
  return () => Promise.reject(new GeocodeError(code));
}
const query = { text: "Ilica 1", countryCode: "HR" };

describe("chain", () => {
  it.each(["rate_limited", "auth", "unavailable"] as const)(
    "falls through on %s",
    async (code) => {
      const second = vi.fn(() => Promise.resolve([HIT]));
      const result = await searchChain(
        [adapter("geoapify", failing(code)), adapter("photon", second)],
        query,
      );
      expect(result).toEqual({ value: [HIT], degraded: false });
    },
  );

  it("stops on bad_request", async () => {
    const second = vi.fn(() => Promise.resolve([HIT]));
    await expect(
      searchChain(
        [
          adapter("geoapify", failing("bad_request")),
          adapter("photon", second),
        ],
        query,
      ),
    ).rejects.toMatchObject({ code: "bad_request" });
    expect(second).not.toHaveBeenCalled();
  });

  it("continues past an empty answer and skips uncovered adapters", async () => {
    const skipped = vi.fn(() => Promise.resolve([HIT]));
    const result = await suggestChain(
      [
        adapter("dgu", () => Promise.resolve([])),
        adapter("geoapify", skipped, () => false),
        adapter("photon", () => Promise.resolve([HIT])),
      ],
      query,
    );
    expect(result.value).toEqual([HIT]);
    expect(skipped).not.toHaveBeenCalled();
  });

  it("reports degraded when every provider failed, not when they merely found nothing", async () => {
    const down = await searchChain(
      [adapter("photon", failing("unavailable"))],
      query,
    );
    expect(down).toEqual({ value: [], degraded: true });
    const none = await searchChain(
      [adapter("photon", () => Promise.resolve([]))],
      query,
    );
    expect(none).toEqual({ value: [], degraded: false });
  });

  it("skips adapters without suggest, as Nominatim has none", async () => {
    const nominatim: Geocoder = {
      id: "nominatim",
      search: () => Promise.resolve([HIT]),
      reverse: () => Promise.resolve(null),
    };
    expect((await suggestChain([nominatim], query)).value).toEqual([]);
    expect((await searchChain([nominatim], query)).value).toEqual([HIT]);
  });

  it("reverse walks the chain too", async () => {
    const miss = adapter("dgu", () => Promise.resolve([]));
    const found: Geocoder = {
      ...miss,
      id: "photon",
      reverse: () => Promise.resolve(HIT),
    };
    expect(
      (await reverseChain([miss, found], { lat: 1, lng: 1 })).value,
    ).toEqual(HIT);
  });
});

describe("circuit breaker", () => {
  it("opens for ten minutes after an auth error, then closes", async () => {
    let now = 0;
    const call = vi.fn(failing("auth"));
    const guarded = withBreaker(
      adapter("photon", call),
      createBreaker(() => now),
    );

    await expect(guarded.search(query)).rejects.toMatchObject({ code: "auth" });
    await expect(guarded.search(query)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(call).toHaveBeenCalledTimes(1);

    now = 10 * 60 * 1000 - 1;
    await expect(guarded.search(query)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(call).toHaveBeenCalledTimes(1);

    now = 10 * 60 * 1000;
    await expect(guarded.search(query)).rejects.toMatchObject({ code: "auth" });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("pauses a rate-limited provider for a minute and an unavailable one for 30 seconds", async () => {
    let now = 0;
    const limited = vi.fn(failing("rate_limited"));
    const guarded = withBreaker(
      adapter("photon", limited),
      createBreaker(() => now),
    );
    await expect(guarded.search(query)).rejects.toMatchObject({
      code: "rate_limited",
    });
    await expect(guarded.search(query)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(limited).toHaveBeenCalledTimes(1);
    now = 60_000;
    await expect(guarded.search(query)).rejects.toMatchObject({
      code: "rate_limited",
    });
    expect(limited).toHaveBeenCalledTimes(2);

    now = 0;
    const down = vi.fn(failing("unavailable"));
    const flaky = withBreaker(
      adapter("photon", down),
      createBreaker(() => now),
    );
    await expect(flaky.search(query)).rejects.toMatchObject({
      code: "unavailable",
    });
    now = 29_999;
    await flaky.search(query).catch(() => undefined);
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("does not open on bad_request", async () => {
    const call = vi.fn(failing("bad_request"));
    const guarded = withBreaker(
      adapter("photon", call),
      createBreaker(() => 0),
    );
    await expect(guarded.search(query)).rejects.toMatchObject({
      code: "bad_request",
    });
    await expect(guarded.search(query)).rejects.toMatchObject({
      code: "bad_request",
    });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("skips Photon for a country without a box instead of pausing it for every country", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ features: [] }))),
    );
    const photon = withBreaker(
      createPhoton({ fetcher, userAgent: "test" }),
      createBreaker(() => 0),
    );
    const norway = await searchChain([photon], {
      text: "Oslo",
      countryCode: "NO",
    });
    expect(norway).toEqual({ value: [], degraded: false });
    await searchChain([photon], query);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("http mapping", () => {
  function respond(status: number, body: unknown = {}): typeof fetch {
    return () =>
      Promise.resolve(new Response(JSON.stringify(body), { status }));
  }

  it.each([
    [429, "rate_limited"],
    [403, "auth"],
    [401, "auth"],
    [400, "bad_request"],
    [500, "unavailable"],
  ] as const)("status %i is %s", async (status, code) => {
    await expect(
      getJson(respond(status), "https://x.test"),
    ).rejects.toMatchObject({ code });
  });

  it("a network failure or timeout is unavailable", async () => {
    const boom = (() =>
      Promise.reject(new TypeError("fetch failed"))) as typeof fetch;
    await expect(getJson(boom, "https://x.test")).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("passes the 3 second timeout signal to fetch", async () => {
    const spy = vi.fn(respond(200, { ok: 1 }));
    await getJson(spy, "https://x.test");
    const signal = (
      spy.mock.calls[0] as unknown as [string, { signal: AbortSignal }]
    )[1].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
