// Missions: each sortie is a route of rings over the archipelago, flown in order, and
// the sortie ends with a landing back on the home runway. A ring is a hoop in the sky
// with a direction of travel; flying through it in that direction counts.
import { RING } from './config.js';

function ring(x, alt, z, nx, nz, radius, label) {
  const len = Math.hypot(nx, nz) || 1;
  return { x, alt, z, nx: nx / len, nz: nz / len, radius, label, passed: false };
}

/** The route for a sortie: later sorties fly the same legs a little lower and tighter. */
export function sortieRings(sortie) {
  const tight = Math.max(0.8, 1 - (sortie - 1) * 0.06);
  const low = (sortie - 1) * 6;
  return [
    ring(0, 60 - low, 900, 0, 1, 32 * tight, 'Climb-out'),
    ring(-350, 95 - low, 1600, 0, 1, 30 * tight, 'Lagoon turn'),
    ring(10, 150 - low, 2500, 0, 1, 30 * tight, 'Mountain pass'),
    ring(850, 120 - low, 1950, 0.8, -0.6, 30 * tight, 'City overflight'),
    ring(500, 90 - low, 3300, -0.25, 0.97, 30 * tight, 'Harbour run'),
    ring(-250, 110 - low, 1500, -0.38, -0.92, 30 * tight, 'Downwind leg'),
    ring(-350, 80 - low, -350, 1, 0, 30 * tight, 'Base turn'),
    ring(0, 55 - low, -250, 0, 1, 36 * tight, 'Final approach'),
  ];
}

/** The next ring not yet flown, or null when the route is done. */
export function nextRing(rings) {
  for (const r of rings) if (!r.passed) return r;
  return null;
}

/**
 * Check a ring crossing for this step. `prev` is the plane position before the step,
 * `plane` after it. Returns the ring when the plane crossed its gate in the ring's
 * direction, close enough in height and sideways offset.
 */
export function checkRing(rings, prev, plane) {
  for (const r of rings) {
    if (r.passed) continue;
    const dPrev = (prev.x - r.x) * r.nx + (prev.z - r.z) * r.nz;
    const dNow = (plane.x - r.x) * r.nx + (plane.z - r.z) * r.nz;
    if (dPrev < 0 && dNow >= 0) {
      const sideways = Math.abs((plane.x - r.x) * r.nz - (plane.z - r.z) * r.nx);
      const height = Math.abs(plane.alt - r.alt);
      if (sideways < r.radius && height < r.radius) {
        r.passed = true;
        return r;
      }
    }
  }
  return null;
}

/** Points for a ring: base points plus a speed bonus for flying it fast. */
export function ringScore(plane) {
  return RING.score + Math.round((plane.speed / 60) * RING.timeBonus);
}
