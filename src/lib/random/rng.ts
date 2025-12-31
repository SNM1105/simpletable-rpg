export type Rng = {
  nextFloat01: () => number;
};

export function createMulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return {
    nextFloat01: () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function createTimeSeed(): number {
  // Frontend-only seed; for a real game this should come from persisted campaign state.
  return Date.now() >>> 0;
}
