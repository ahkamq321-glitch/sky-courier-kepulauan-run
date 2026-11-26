// Seeded random numbers and smooth value noise: the world is the same for one seed,
// different for another, and no two runs need the network or a file.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tiny hash of two integer grid coordinates, stable for any seed. */
function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Value noise in [-1, 1] at one scale; cheap enough to call thousands of times a frame. */
export function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Two octaves of value noise, still in roughly [-1, 1]. */
export function fbm(x, z, seed) {
  return valueNoise(x, z, seed) * 0.65 + valueNoise(x * 2.13 + 7.7, z * 2.13 - 3.1, seed + 11) * 0.35;
}

/** A gaussian bump: 1 at the centre, fading to 0 at about 2.2 radii. */
export function bump(x, z, cx, cz, radius) {
  const dx = (x - cx) / radius;
  const dz = (z - cz) / radius;
  const d2 = dx * dx + dz * dz;
  return d2 > 5 ? 0 : Math.exp(-d2);
}
