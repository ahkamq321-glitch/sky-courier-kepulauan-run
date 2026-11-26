// The game itself: one state, one fixed step, and the rules that turn flying into
// a score. Title, flying, landed and crashed are the phases; rings, fuel, damage
// and the wind are what make each sortie a decision.
import { STEP, PLANE, SORTIE } from './config.js';
import { createRandom } from './random.js';
import { createPlane, stepPlane } from './aircraft.js';
import { sortieRings, nextRing, checkRing, ringScore } from './rings.js';
import { createTerrainGrid, makeClouds, terrainHeightAt, terrainKindAt, inRunway } from './terrain.js';

export const EVENT_RING = 1;
export const EVENT_LAND = 2;
export const EVENT_CRASH = 4;
export const EVENT_OVER = 8;

export function createWorld(random) {
  const grid = createTerrainGrid();
  const clouds = makeClouds(random);
  const state = {
    grid,
    clouds,
    plane: createPlane(),
    rings: sortieRings(1),
    score: 0,
    sortie: 1,
    phase: 'title',
    time: 0,
    wind: { x: -1.6, z: 0.8, speed: 2, from: 'E' },
    messages: [],
    flash: 0,
    crashReason: '',
    stormCooldown: 0,
    stallWarned: 0,
    stats: { rings: 0, landings: 0, crashes: 0 },
  };
  return {
    state,
    reset() {
      state.plane = createPlane();
      state.rings = sortieRings(1);
      state.score = 0;
      state.sortie = 1;
      state.phase = 'title';
      state.time = 0;
      state.messages = [];
      state.flash = 0;
      state.crashReason = '';
      state.stormCooldown = 0;
      state.stats = { rings: 0, landings: 0, crashes: 0 };
      setWind(state, 1);
    },
    nextSortie() {
      state.sortie += 1;
      state.plane = createPlane();
      state.rings = sortieRings(state.sortie);
      state.phase = 'play';
      state.messages = [];
      state.flash = 0;
      state.crashReason = '';
      setWind(state, state.sortie);
      pushToast(state, `SORTIE ${state.sortie} — tighter rings, stronger wind`, 'good', true, 3);
    },
    /**
     * Advance the world one fixed step. `ctl` is the steering for this step and
     * `audio` the sound maker (or null in screenshot staging). Returns an event mask.
     */
    step(dt, ctl, audio) {
      if (state.phase !== 'play') return 0;
      state.time += dt;
      state.flash = Math.max(0, state.flash - dt * 1.4);
      state.stormCooldown = Math.max(0, state.stormCooldown - dt);
      const plane = state.plane;
      const prev = { x: plane.x, z: plane.z };
      const event = stepPlane(plane, dt, ctl, state.wind);
      let mask = 0;
      if (event === 'takeoff') pushToast(state, 'AIRBORNE — gear up, flaps up', '', false, 2);
      if (event === 'stall' && state.time - state.stallWarned > 3) {
        state.stallWarned = state.time;
        pushToast(state, 'STALL — nose down, add power', 'bad', false, 2);
      }
      const passed = checkRing(state.rings, prev, plane);
      if (passed) {
        const points = ringScore(plane);
        state.score += points;
        state.stats.rings += 1;
        plane.fuel = Math.min(100, plane.fuel + PLANE.ringFuel);
        const flown = state.rings.filter((r) => r.passed).length;
        pushToast(state, `RING ${flown}/${state.rings.length} — ${passed.label} +${points}`, 'good', true, 2.5);
        if (audio) audio.ring();
        mask |= EVENT_RING;
      }
      // Storm cells: flying through one hurts the airframe and shakes the plane.
      if (state.stormCooldown <= 0) {
        for (const cloud of state.clouds) {
          if (!cloud.storm) continue;
          const dx = plane.x - cloud.x;
          const dz = plane.z - cloud.z;
          const dh = plane.alt - cloud.alt;
          if (dx * dx + dz * dz < cloud.radius * cloud.radius && Math.abs(dh) < 60) {
            plane.damage = Math.min(100, plane.damage + PLANE.stormDamage);
            state.flash = 1;
            state.stormCooldown = 2;
            pushToast(state, `STORM CELL — hull -${PLANE.stormDamage}%`, 'bad', false, 2);
            if (audio) audio.alarm();
            break;
          }
        }
      }
      if (plane.fuel <= 0 && !plane.onGround && state.time - (state.fuelWarned || 0) > 5) {
        state.fuelWarned = state.time;
        pushToast(state, 'FUEL EMPTY — gliding, find the runway', 'bad', true, 3);
        if (audio) audio.alarm();
      }
      if (event === 'touchdown') {
        state.stats.landings += 1;
        if (nextRing(state.rings) === null) {
          const bonus = 200 + Math.round(plane.fuel * 2);
          state.score += bonus;
          state.phase = 'landed';
          pushToast(state, `SORTIE COMPLETE +${bonus}`, 'good', true, 4);
          mask |= EVENT_LAND;
        } else {
          state.score += 50;
          plane.fuel = 100;
          plane.damage = Math.max(0, plane.damage - 40);
          pushToast(state, 'TOUCHDOWN +50 — refuelled and patched up', 'good', true, 2.5);
          mask |= EVENT_LAND;
        }
      } else if (event === 'hard') {
        state.flash = 1;
        pushToast(state, 'HARD LANDING — hull damaged', 'bad', false, 2);
        if (audio) audio.thud();
      } else if (event === 'crash') {
        state.stats.crashes += 1;
        state.phase = 'over';
        state.crashReason = crashReasonFor(plane);
        if (audio) audio.thud();
        mask |= EVENT_CRASH | EVENT_OVER;
      }
      if (plane.damage >= 100 && state.phase === 'play') {
        state.stats.crashes += 1;
        state.phase = 'over';
        state.crashReason = 'The airframe gave out after too many hits.';
        if (audio) audio.thud();
        mask |= EVENT_CRASH | EVENT_OVER;
      }
      if (plane.fuel <= 0 && plane.onGround && plane.speed < 5 && state.phase === 'play') {
        state.phase = 'over';
        state.crashReason = 'Out of fuel on the ground, short of the runway.';
        mask |= EVENT_OVER;
      }
      return mask;
    },
  };
}

function setWind(state, sortie) {
  const speed = 2 + (sortie - 1) * SORTIE.windPerSortie;
  state.wind = { x: -speed * 0.8, z: speed * 0.4, speed, from: 'E' };
}

export function pushToast(state, text, kind, big, seconds) {
  state.messages.push({ text, kind: kind || '', big: !!big, until: state.time + seconds });
  if (state.messages.length > 4) state.messages.shift();
}

function crashReasonFor(plane) {
  const kind = terrainKindAt(plane.x, plane.z);
  if (kind === 'sea') return 'Ditched in the sea — the mail got wet.';
  if (kind === 'snow' || kind === 'rock') return 'Flew into the mountain. The pass is lower.';
  if (inRunway(plane.x, plane.z)) return 'Crashed on the runway — too fast, too steep.';
  if (plane.fuel <= 0) return 'Ran out of fuel and fell short of the runway.';
  return 'Crashed into the ground. Mind the terrain.';
}
