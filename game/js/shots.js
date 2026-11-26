// The screenshot scenes behind ?shot=takeoff|ring|city|landing. Each one plays the
// real rules forward from a fresh world for a fixed time, steered by a simple
// autopilot that aims at the next ring (or the runway, for the landing), so the
// frame is what a short game really looks like and the same seed gives the same frame.
import { STEP } from './config.js';
import { nextRing } from './rings.js';
import { terrainHeightAt } from './terrain.js';

const TAKEOFF_SECONDS = 7;
const RING_SECONDS = 22;
const CITY_SECONDS = 74;

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Steer toward a ring: bank into the heading error, pitch toward the height,
 * and slow down when close, when the turn radius matters most.
 */
function autopilot(state, ring) {
  const plane = state.plane;
  const dist = Math.hypot(ring.x - plane.x, ring.z - plane.z);
  const desiredHeading = Math.atan2(ring.x - plane.x, ring.z - plane.z);
  const error = wrapAngle(desiredHeading - plane.heading);
  const bank = clamp(error * 1.4, -1, 1);
  // Never fly into a hillside the route forgot: stay 50 m above the ground ahead.
  const aheadX = plane.x + Math.sin(plane.heading) * 220;
  const aheadZ = plane.z + Math.cos(plane.heading) * 220;
  const safeAlt = Math.max(ring.alt, terrainHeightAt(aheadX, aheadZ) + 50);
  const pitch = clamp((safeAlt - plane.alt) / 35, -1, 1);
  const slow = dist < 500;
  const lo = slow ? 36 : 42;
  const hi = slow ? 44 : 56;
  let throttle = 0;
  if (plane.onGround) throttle = 1;
  else if (plane.speed < lo) throttle = 1;
  else if (plane.speed > hi) throttle = -1;
  return { bank, pitch, throttle };
}

/** The landing autopilot: slow down, follow the glide, aim at the runway centre. */
function landingPilot(state) {
  const plane = state.plane;
  const dist = Math.hypot(0 - plane.x, 350 - plane.z);
  const desiredHeading = Math.atan2(0 - plane.x, 350 - plane.z);
  const error = wrapAngle(desiredHeading - plane.heading);
  const bank = clamp(error * 1.6, -1, 1);
  // Glide slope: about 55 m over the final ring, down to the runway.
  const glideAlt = 4 + Math.max(0, -plane.z) * 0.12;
  const pitch = clamp((glideAlt - plane.alt) / 18, -1, 1);
  let throttle = 0;
  if (plane.onGround) throttle = plane.speed < 12 ? 0 : -1;
  else if (plane.speed < 34) throttle = 0.6;
  else if (plane.speed > 44) throttle = -1;
  else if (dist < 500) throttle = -0.4;
  return { bank, pitch, throttle };
}

/** Put the plane on final approach directly, for a landing frame the autopilot
 *  could not reach on its own. The state is one the game can really be in. */
function placeOnFinal(state) {
  const plane = state.plane;
  plane.x = -30;
  plane.z = -420;
  plane.alt = 55;
  plane.heading = 0.05;
  plane.pitch = -0.05;
  plane.bank = 0;
  plane.speed = 40;
  plane.throttle = 0.35;
  plane.fuel = 55;
  plane.onGround = false;
  for (const r of state.rings) r.passed = true;
}

function runFor(world, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.state.phase === 'over') break;
    world.step(STEP, pilot(world.state), null);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. Unknown names stage the takeoff.
 */
export function stageShot(name, world) {
  world.reset();
  world.state.phase = 'play';
  if (name === 'ring') {
    runFor(world, RING_SECONDS, (state) => {
      const ring = nextRing(state.rings);
      if (!ring) return landingPilot(state);
      return autopilot(state, ring);
    });
    return { screen: 'play', best: world.state.score };
  }
  if (name === 'city') {
    runFor(world, CITY_SECONDS, (state) => {
      const ring = nextRing(state.rings);
      if (!ring) return landingPilot(state);
      return autopilot(state, ring);
    });
    return { screen: 'play', best: world.state.score };
  }
  if (name === 'landing') {
    // Fly the whole route, but stop the moment the plane is established on
    // final: wings nearly level, lined up with the runway, descending. If it
    // lands first that frame is just as good; if it never gets there, stage
    // the final approach directly instead of showing a steep turn.
    const limitSteps = Math.floor(300 / STEP);
    let framed = false;
    for (let i = 0; i < limitSteps; i += 1) {
      const state = world.state;
      if (state.phase === 'over') break;
      if (state.phase === 'landed') {
        framed = true;
        break;
      }
      const ring = nextRing(state.rings);
      world.step(STEP, ring ? autopilot(state, ring) : landingPilot(state), null);
      const plane = state.plane;
      if (
        !ring &&
        !plane.onGround &&
        Math.abs(wrapAngle(plane.heading)) < 0.22 &&
        Math.abs(plane.x) < 100 &&
        plane.alt < 80 &&
        plane.z > -600 &&
        plane.z < -50
      ) {
        framed = true;
        break;
      }
    }
    if (!framed) {
      world.reset();
      world.state.phase = 'play';
      placeOnFinal(world.state);
      runFor(world, 7, landingPilot);
    }
    return { screen: 'play', best: world.state.score };
  }
  runFor(world, TAKEOFF_SECONDS, (state) => {
    const ring = nextRing(state.rings);
    if (!ring) return landingPilot(state);
    return autopilot(state, ring);
  });
  return { screen: 'play', best: world.state.score };
}
