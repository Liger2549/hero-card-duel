// Seeded RNG (mulberry32). The seed lives in GameState, so the same seed and
// the same actions always give the same game.

// Returns a whole number from 0 to n - 1 and advances the seed.
export function randInt(s: { rng: number }, n: number): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return Math.floor(r * n);
}
