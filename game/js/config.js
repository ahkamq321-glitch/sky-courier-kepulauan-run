// Shared constants for Karst Bay Courier: missions, weather variants, colours, flight model.
// One source of truth — every module imports from here so the HUD, world and missions agree.
export const MISSIONS = [
  { id: 'mail', name: 'Mail Run', rings: 12, weather: 'DUSK', pay: 180, desc: 'Thread 12 glowing rings between the karst towers.' },
  { id: 'storm', name: 'Storm Courier', rings: 8, weather: 'STORM', pay: 260, desc: 'Fewer rings, worse visibility, higher pay.' },
  { id: 'night', name: 'Night Lighthouse', rings: 10, weather: 'NIGHT', pay: 320, desc: 'Follow the lighthouse beam through cyan rings.' },
];

export const WEATHER = {
  DUSK: {
    skyTop: 0x6b4a8a, skyMid: 0xd96a5f, horizon: 0xff9a4d, fog: 0xe88a63,
    sunColor: 0xffb347, sunPos: [-420, 70, -900], ambient: 0x8a6a9a, ground: 0x2a7a7a,
    hemiSky: 0xc98ab0, hemiGround: 0x2a6a6a, light: 0xffc27a, lightIntensity: 1.15,
    ringColor: 0xffd21f, ringEmissive: 0xcc9900, cloud: 0xffd9c0, sea: 0x1f8a8a,
  },
  STORM: {
    skyTop: 0x3a4148, skyMid: 0x5a626c, horizon: 0x7a828c, fog: 0x6a727c,
    sunColor: 0x9aa2ac, sunPos: [-300, 220, -700], ambient: 0x5a626c, ground: 0x3a4a4a,
    hemiSky: 0x7a828c, hemiGround: 0x2a3a3a, light: 0xb0b8c0, lightIntensity: 0.85,
    ringColor: 0xffe14d, ringEmissive: 0xaa8800, cloud: 0x8a929c, sea: 0x2a5a5e,
  },
  NIGHT: {
    skyTop: 0x060a1e, skyMid: 0x0e1a3a, horizon: 0x1e2a4a, fog: 0x0a1226,
    sunColor: 0xcfd8ff, sunPos: [350, 260, -800], ambient: 0x2a3455, ground: 0x0a1a2a,
    hemiSky: 0x2a3a5e, hemiGround: 0x06101c, light: 0x8a9ac8, lightIntensity: 0.45,
    ringColor: 0x19e8ff, ringEmissive: 0x00aacc, cloud: 0x2a3455, sea: 0x0a2a3a,
  },
};

export const PLANE = { speed: 42, maxSpeed: 78, minSpeed: 18, turnRate: 0.9, pitchRate: 0.7 };
export const RING = { radius: 8, tube: 0.7, spacing: 46, firstAhead: 58 };
export const START = { x: 0, y: 56, z: 130 };

export const HUD_TEXT = {
  tower: {
    mail: 'KARST TOWER: Mail Run — 12 rings, follow the guide trail.',
    storm: 'KARST TOWER: Storm Courier — visibility poor, trust the trail.',
    night: 'KARST TOWER: Night Lighthouse — beam is on, rings are lit.',
  },
  command: ['HOLD ALTITUDE', 'DESCEND 60 FT', 'CLIMB 40 FT', 'BANK LEFT', 'BANK RIGHT', 'STRAIGHT AHEAD'],
};

export const DIALOG_LINES = [
  'KARST TOWER: Mail Run — 12 rings, follow the guide trail.',
  'KARST TOWER: Ring 3 ahead — descend 60 FT, nice and easy.',
  'KARST TOWER: Halfway there — keep the lighthouse on your right.',
  'KARST TOWER: Final rings — contract pays CR 180 on delivery.',
];

// Deterministic pseudo-random generator so every run places the world identically.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}
export function nm(distUnits) { return (distUnits / 185.2).toFixed(1); }
