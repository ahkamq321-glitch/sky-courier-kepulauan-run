// Missions: ring trails, state, scoring. Rings weave between the karst towers along -Z.
// The current ring is solid and bright; the next 3-4 are translucent ghosts showing the trail.
import { RING, WEATHER, START } from './config.js';

export function buildRings(mission) {
  const w = WEATHER[mission.weather];
  const rings = [];
  for (let i = 0; i < mission.rings; i++) {
    const z = START.z - RING.firstAhead - i * RING.spacing;
    const x = Math.sin(i * 0.9) * 18 + Math.sin(i * 0.45) * 5;
    const y = 56 + Math.sin(i * 0.55) * 13;
    rings.push({ x, y, z, passed: false });
  }
  return rings;
}

export function ringMeshes(rings, mission) {
  const w = WEATHER[mission.weather];
  const group = new THREE.Group();
  const meshes = [];
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const mat = new THREE.MeshBasicMaterial({
      color: w.ringColor, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
    });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(RING.radius, RING.tube, 10, 28), mat);
    torus.position.set(r.x, r.y, r.z);
    torus.rotation.y = 0;
    group.add(torus);
    meshes.push(torus);
    // Inner glow disc so the ring reads even at distance.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(RING.radius * 0.92, 24),
      new THREE.MeshBasicMaterial({ color: w.ringColor, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.position.set(r.x, r.y, r.z);
    group.add(disc);
  }
  return { group, meshes };
}

export function createMissionState(mission, startRingIndex) {
  return {
    mission, rings: buildRings(mission), index: startRingIndex || 0,
    ringsHit: startRingIndex || 0, timer: (startRingIndex || 0) * 45, score: (startRingIndex || 0) * 150,
    done: false, crashed: false, fuel: 100, hull: 100, throttle: 0.72,
  };
}

// Current ring = the one the plane is flying toward; ghost trail = the next 3 after it.
export function updateRingVisuals(state, meshes) {
  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i];
    if (i < state.index) { m.material.opacity = 0.0; m.visible = false; }
    else if (i === state.index) { m.visible = true; m.material.opacity = 0.98; m.scale.setScalar(1); }
    else if (i <= state.index + 3) { m.visible = true; m.material.opacity = 0.28; m.scale.setScalar(0.96); }
    else { m.visible = true; m.material.opacity = 0.12; m.scale.setScalar(0.92); }
  }
}

export function currentRing(state) {
  return state.rings[Math.min(state.index, state.rings.length - 1)];
}

export function checkRingPass(state, planePos) {
  const r = state.rings[state.index];
  if (!r) return false;
  const dx = planePos.x - r.x, dy = planePos.y - r.y, dz = planePos.z - r.z;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d < RING.radius + 3.5) {
    r.passed = true;
    state.ringsHit += 1;
    state.score += 150;
    state.index += 1;
    if (state.index >= state.rings.length) state.done = true;
    return true;
  }
  return false;
}

export function missionDialog(state) {
  const m = state.mission;
  const hit = state.ringsHit, total = m.rings;
  if (state.done) return 'KARST TOWER: All rings clear — contract complete, CR ' + m.pay + ' paid.';
  if (state.crashed) return 'KARST TOWER: Mayday received — rescue boat is on its way.';
  if (hit === 0) return 'KARST TOWER: ' + m.name + ' — ' + total + ' rings, follow the guide trail.';
  if (hit < total / 2) return 'KARST TOWER: Ring ' + (state.index + 1) + ' ahead — steady on the trail.';
  return 'KARST TOWER: Final rings — contract pays CR ' + m.pay + ' on delivery.';
}
