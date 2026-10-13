// Small deterministic PRNG (mulberry32) so every run of the seed makes the same entries.
export function createRandom(seed: number) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
    sample<T>(items: readonly T[], count: number): T[] {
      const pool = [...items];
      const out: T[] = [];
      while (out.length < count && pool.length > 0)
        out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      return out;
    },
  };
}
export type Random = ReturnType<typeof createRandom>;
