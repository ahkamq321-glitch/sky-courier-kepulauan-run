// The archipelago: one height function for the whole world, plus the places the
// missions care about (the home runway, the city, the mountain pass, the harbour).
// Everything the renderer and the physics need comes from terrainHeightAt(x, z).
import { fbm, bump } from './random.js';
import { PALETTE } from './config.js';

const SEED = 20261126;

/** The home runway: flat apron along +z from z = 0 to z = 700, centred on x = 0. */
export const RUNWAY = { x: 0, z0: 0, z1: 700, halfWidth: 34, ground: 2 };

/** The city the fourth ring crosses, and the harbour the fifth ring crosses. */
export const CITY = { x0: 620, x1: 1180, z0: 1480, z1: 2150 };
export const HARBOUR = { x: 500, z: 3300 };

/** Twin peaks with a flyable pass between them, on the way to ring three. */
const PEAKS = [
  { x: -520, z: 2500, radius: 420, height: 185 },
  { x: 560, z: 2560, radius: 460, height: 205 },
  { x: -1250, z: 3850, radius: 520, height: 230 },
  { x: 1560, z: 4150, radius: 480, height: 170 },
];

/** Islands that lift the sea floor into land. */
const ISLANDS = [
  { x: 0, z: 1800, radius: 2000, height: 55 },
  { x: -1250, z: 3300, radius: 1250, height: 44 },
  { x: 1450, z: 800, radius: 1050, height: 38 },
  { x: 650, z: 3900, radius: 950, height: 32 },
];

/** Distance from a point to the runway rectangle, in metres (0 inside it). */
function runwayDistance(x, z) {
  const dx = Math.max(Math.abs(x - RUNWAY.x) - RUNWAY.halfWidth, 0);
  const dz = Math.max(Math.max(RUNWAY.z0 - z, z - RUNWAY.z1), 0);
  return Math.hypot(dx, dz);
}

/** Ground height in metres at world (x, z). Sea is below 0, land above. */
export function terrainHeightAt(x, z) {
  const rolling = fbm(x / 950, z / 950, SEED) * 42;
  let height = rolling - 34;
  for (const island of ISLANDS) height += island.height * bump(x, z, island.x, island.z, island.radius);
  for (const peak of PEAKS) height += peak.height * bump(x, z, peak.x, peak.z, peak.radius);
  // Carve the flyable pass between the twin peaks and the harbour bay.
  height -= 95 * bump(x, z, 10, 2500, 480);
  height -= 70 * bump(x, z, HARBOUR.x, HARBOUR.z, 700);
  // The home runway sits on a flattened apron so takeoffs and landings are level.
  const d = runwayDistance(x, z);
  if (d < 260) {
    const t = d / 260;
    const blend = t * t * (3 - 2 * t);
    height = RUNWAY.ground + (height - RUNWAY.ground) * blend;
  }
  return height;
}

export function inRunway(x, z) {
  return Math.abs(x - RUNWAY.x) <= RUNWAY.halfWidth && z >= RUNWAY.z0 && z <= RUNWAY.z1;
}

export function inCity(x, z) {
  return x >= CITY.x0 && x <= CITY.x1 && z >= CITY.z0 && z <= CITY.z1;
}

/** What kind of ground this is, for the renderer and for crash rules. */
export function terrainKindAt(x, z) {
  if (inRunway(x, z)) return 'runway';
  const h = terrainHeightAt(x, z);
  if (h < 0.5) return 'sea';
  if (h < 2.5) return 'sand';
  if (inCity(x, z)) return 'city';
  if (h > 120) return 'snow';
  if (h > 65) return 'rock';
  if (h > 26) return 'forest';
  return 'grass';
}

/** The flat colour of a kind, with a little deterministic variation so the ground reads. */
export function terrainColourAt(x, z) {
  const kind = terrainKindAt(x, z);
  const h = terrainHeightAt(x, z);
  const vary = fbm(x / 160 + 3, z / 160 - 5, SEED + 5) * 0.5 + 0.5;
  switch (kind) {
    case 'runway': {
      // White centreline dashes every 60 m, plus the threshold bars at each end.
      const dash = Math.abs(x - RUNWAY.x) < 2.5 && ((z % 60) + 60) % 60 < 32;
      const threshold = (z < 40 || z > RUNWAY.z1 - 40) && Math.abs(x - RUNWAY.x) > 8 && Math.abs(x - RUNWAY.x) < 28;
      if (dash || threshold) return PALETTE.runwayMark;
      return PALETTE.runway;
    }
    case 'sea':
      return h < -14 ? PALETTE.seaDeep : PALETTE.seaShallow;
    case 'sand':
      return PALETTE.sand;
    case 'city': {
      const block = (Math.floor(x / 55) + Math.floor(z / 55)) % 2 === 0;
      return block ? PALETTE.city : PALETTE.cityDark;
    }
    case 'snow':
      return PALETTE.snow;
    case 'rock':
      return vary > 0.6 ? '#9a8d7f' : PALETTE.rock;
    case 'forest':
      return vary > 0.55 ? '#357f42' : PALETTE.forest;
    default:
      return vary > 0.62 ? PALETTE.grassDry : PALETTE.grass;
  }
}

/** Clouds for the sky: slow white puffs, plus three dark storm cells to avoid. */
export function makeClouds(random) {
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({
      x: -2600 + random() * 5200,
      z: -600 + random() * 4800,
      alt: 320 + random() * 220,
      radius: 70 + random() * 90,
      storm: false,
    });
  }
  const storms = [
    { x: -260, z: 2850, alt: 260, radius: 110 },
    { x: 700, z: 1150, alt: 300, radius: 100 },
    { x: -900, z: 900, alt: 280, radius: 95 },
  ];
  for (const s of storms) clouds.push({ ...s, storm: true });
  return clouds;
}

/**
 * A precomputed height-and-colour grid for the renderer: sampling the analytic
 * height function 20,000 times a frame is too slow, so the world is baked once
 * at boot (about 90,000 cells) and the renderer samples it with bilinear reads.
 */
export function createTerrainGrid() {
  const x0 = -3400;
  const z0 = -1000;
  const cell = 20;
  const nx = 341;
  const nz = 271;
  const heights = new Float32Array(nx * nz);
  const colours = new Uint32Array(nx * nz);
  for (let j = 0; j < nz; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const x = x0 + i * cell;
      const z = z0 + j * cell;
      const index = j * nx + i;
      heights[index] = terrainHeightAt(x, z);
      colours[index] = colourToInt(terrainColourAt(x, z));
    }
  }
  return { x0, z0, cell, nx, nz, heights, colours };
}

/** Bilinear height from the baked grid; outside the grid the sea takes over. */
export function gridHeightAt(grid, x, z) {
  const gx = (x - grid.x0) / grid.cell;
  const gz = (z - grid.z0) / grid.cell;
  const i = Math.floor(gx);
  const j = Math.floor(gz);
  if (i < 0 || j < 0 || i >= grid.nx - 1 || j >= grid.nz - 1) return -30;
  const fx = gx - i;
  const fz = gz - j;
  const h = grid.heights;
  const nx = grid.nx;
  const a = h[j * nx + i];
  const b = h[j * nx + i + 1];
  const c = h[(j + 1) * nx + i];
  const d = h[(j + 1) * nx + i + 1];
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Nearest colour cell from the baked grid, as a packed 0xRRGGBB integer. */
export function gridColourAt(grid, x, z) {
  const i = Math.round((x - grid.x0) / grid.cell);
  const j = Math.round((z - grid.z0) / grid.cell);
  if (i < 0 || j < 0 || i >= grid.nx || j >= grid.nz) return 0x14506e;
  return grid.colours[j * grid.nx + i];
}

/** Bilinear colour from the baked grid, as [r, g, b] floats: smooths the 20 m
 *  cells so distant ground reads as rolling terrain, not square tiles. */
export function gridColourSmooth(grid, x, z) {
  const gx = (x - grid.x0) / grid.cell - 0.5;
  const gz = (z - grid.z0) / grid.cell - 0.5;
  const i = Math.floor(gx);
  const j = Math.floor(gz);
  const fx = gx - i;
  const fz = gz - j;
  const c = (ii, jj) => {
    const ci = Math.max(0, Math.min(grid.nx - 1, ii));
    const cj = Math.max(0, Math.min(grid.nz - 1, jj));
    const packed = grid.colours[cj * grid.nx + ci];
    return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
  };
  const a = c(i, j);
  const b = c(i + 1, j);
  const cc = c(i, j + 1);
  const d = c(i + 1, j + 1);
  return [0, 1, 2].map(
    (k) => a[k] + (b[k] - a[k]) * fx + (cc[k] - a[k]) * fz + (a[k] - b[k] - cc[k] + d[k]) * fx * fz,
  );
}

function colourToInt(css) {
  const r = parseInt(css.slice(1, 3), 16);
  const g = parseInt(css.slice(3, 5), 16);
  const b = parseInt(css.slice(5, 7), 16);
  return (r << 16) | (g << 8) | b;
}
