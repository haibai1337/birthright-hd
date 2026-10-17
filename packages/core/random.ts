// Mulberry32 with explicitly serialized uint32 state; zero is a valid seed.
export function randomInt(state: { rng: number }, min: number, max: number): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let t = Math.imul(state.rng ^ (state.rng >>> 15), 1 | state.rng);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return min + Math.floor(value * (max - min + 1));
}
