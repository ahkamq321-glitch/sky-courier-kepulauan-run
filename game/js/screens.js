// Scene resolution: the game renders one deterministic scene from the URL alone.
// ?scene=chase | cockpit | missions | night — no input needed, so screenshots are stable.
import { MISSIONS } from './config.js';

export const SCENES = {
  chase: { mission: 'mail', ringIndex: 2, camera: 'chase', overlay: 'hud', label: 'Mail Run — chase' },
  cockpit: { mission: 'mail', ringIndex: 1, camera: 'cockpit', overlay: 'hud', label: 'Mail Run — cockpit approach' },
  missions: { mission: 'mail', ringIndex: 0, camera: 'orbit', overlay: 'menu', label: 'Mission select' },
  night: { mission: 'night', ringIndex: 4, camera: 'chase', overlay: 'hud', label: 'Night Lighthouse' },
  title: { mission: 'mail', ringIndex: 0, camera: 'orbit', overlay: 'title', label: 'Title screen' },
};

export function resolveScene() {
  const q = new URLSearchParams(location.search);
  const key = q.get('scene') || 'title';
  const scene = SCENES[key] || SCENES.title;
  const mission = MISSIONS.find((m) => m.id === scene.mission) || MISSIONS[0];
  return { key, ...scene, mission };
}

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

// Screen flow states: title -> menu -> flying -> complete | crashed.
// The HUD overlay shows exactly one screen at a time; gameplay keeps running behind menus.
export const SCREENS = ['title', 'menu', 'flying', 'complete', 'crashed'];

export function rankFor(ringsHit, ringsTotal, timeSec, crashed) {
  if (crashed) return '—';
  const frac = ringsTotal ? ringsHit / ringsTotal : 0;
  if (frac >= 1 && timeSec < 240) return 'S';
  if (frac >= 1) return 'A';
  if (frac >= 0.75) return 'B';
  if (frac >= 0.5) return 'C';
  return 'D';
}

export function completeText(mission, ringsHit, timeSec, score) {
  const rank = rankFor(ringsHit, mission.rings, timeSec, false);
  return { title: 'MISSION COMPLETE', rank, score, ringsHit, ringsTotal: mission.rings, timeSec, pay: mission.pay };
}

export function crashText(mission, ringsHit, timeSec, score) {
  return { title: 'MISSION FAILED', rank: '—', score, ringsHit, ringsTotal: mission.rings, timeSec, pay: 0, reason: 'CRASHED — the courier went down.' };
}
