// Sky Courier — Kepulauan Run: every tuning number and colour in one place.
// The play area is a fixed 1280x720 logical canvas; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** World size, in metres: x east, z north, heading 0 is +z. Sea level is altitude 0. */
export const WORLD = { half: 3200, sea: 0 };

export const PLANE = {
  /** Stall speed: below this the wing stops lifting and the nose drops. */
  stallSpeed: 26,
  /** Top level speed at full throttle, metres per second. */
  cruiseSpeed: 62,
  maxSpeed: 85,
  /** How fast the bank and pitch chase their targets, per second. */
  bankRate: 2.6,
  pitchRate: 1.9,
  maxBank: 0.62,
  maxPitch: 0.38,
  /** Coordinated-turn multiplier on the real turn rate g*tan(bank)/speed. */
  turnGain: 1.7,
  /** Thrust acceleration at full throttle, metres per second squared. */
  thrust: 24,
  drag: 0.0062,
  /** Fuel burn, percent per second: idle plus throttle. */
  fuelIdle: 0.1,
  fuelFull: 0.34,
  /** Fuel the courier earns for each ring flown. */
  ringFuel: 6,
  /** Damage taken from one storm-cloud hit. */
  stormDamage: 14,
  /** Vertical speed (m/s) a touchdown may have before it counts as a hard landing. */
  softTouchdown: -6,
};

export const RING = { score: 100, timeBonus: 40 };

/** Sortie count and the extra challenge each later sortie adds. */
export const SORTIE = { maxRings: 8, windPerSortie: 1.5, fuelStart: 100 };

export const PALETTE = {
  skyTop: '#2f6fb4',
  skyMid: '#7fb2dd',
  skyHorizon: '#cfe6f2',
  sun: '#fff3c4',
  seaDeep: '#14506e',
  seaShallow: '#2e86ad',
  sand: '#d9c27a',
  grass: '#5da24a',
  grassDry: '#8aa94e',
  forest: '#2f7a3a',
  rock: '#8a7f74',
  snow: '#e8eef2',
  city: '#7d8894',
  cityDark: '#5c6672',
  runway: '#3a3f46',
  runwayMark: '#f4f6f8',
  ringNext: '#ffb020',
  ringLater: '#7fb2dd',
  ringDone: '#58d68d',
  planeRed: '#d8443c',
  planeWhite: '#f4f6f8',
  planeBlue: '#2456a6',
  panel: '#141a22',
  panelEdge: '#2c3644',
  text: '#eef1f5',
  muted: '#9aa5b1',
  warn: '#ffb020',
  danger: '#ff5a4e',
  good: '#58d68d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sky-courier.best';
