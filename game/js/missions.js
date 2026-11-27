// Missions: glowing rings, the supply crate + parachute, landing detection.
// Rings turn green when flown through; the crate must land on the lighthouse pad.
import { LAYOUT } from './config.js';

export function buildMissions(scene) {
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc93c });
  const ringDoneMat = new THREE.MeshBasicMaterial({ color: 0x7ee081 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.22 });

  // Rings threaded through the bay, hole facing the flight path (along Z).
  const rings = LAYOUT.rings.map((r) => {
    const g = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(16, 1.6, 12, 40), ringMat);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(19, 3.5, 10, 40), glowMat);
    g.add(torus, glow);
    g.position.set(r.x, r.y, r.z);
    scene.add(g);
    return { group: g, torus, x: r.x, y: r.y, z: r.z, cleared: false };
  });

  // Supply crate + parachute dome + strings.
  const crate = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 }));
  box.castShadow = true;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd23b2e, roughness: 0.8, side: THREE.DoubleSide }));
  dome.position.y = 7;
  dome.castShadow = true;
  crate.add(box, dome);
  for (const a of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 8, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    strut.position.set(Math.cos(a) * 3, 3.5, Math.sin(a) * 3);
    strut.rotation.z = Math.cos(a) * 0.5;
    strut.rotation.x = -Math.sin(a) * 0.5;
    crate.add(strut);
  }
  crate.visible = false;
  scene.add(crate);

  let crateState = { active: false, vy: 0, x: 0, y: 0, z: 0 };

  function dropCrate(p) {
    if (crateState.active) return false;
    crateState = { active: true, vy: 0, x: p.x, y: p.y - 3, z: p.z };
    crate.visible = true;
    crate.position.set(crateState.x, crateState.y, crateState.z);
    return true;
  }

  function nextRing(state) {
    for (const r of rings) {
      if (r.cleared) continue;
      const dx = state.plane.x - r.x, dy = state.plane.y - r.y, dz = state.plane.z - r.z;
      return { ring: r, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) };
    }
    return null;
  }

  function reset() {
    for (const r of rings) { r.cleared = false; r.torus.material = ringMat; }
    crate.visible = false;
    crateState.active = false;
    for (const s of [...LAYOUT.hopStrips, LAYOUT.strip]) s._landed = false;
  }

  function update(state, dt) {
    // Rings: fly within 17 m of the centre to clear one.
    if (state.mission.id === 'rings') {
      for (const r of rings) {
        if (r.cleared) continue;
        const dx = state.plane.x - r.x, dy = state.plane.y - r.y, dz = state.plane.z - r.z;
        if (dx * dx + dy * dy + dz * dz < 17 * 17) {
          r.cleared = true;
          r.torus.material = ringDoneMat;
          state.ringsCleared++;
          state.score += 150;
          state.message = 'RING CLEAN +150';
          state.messageTimer = 2;
        }
      }
    }
    // Crate: falls, sways, lands on the pad or misses it.
    if (crateState.active) {
      crateState.vy = Math.min(crateState.vy + 9 * dt, 12);
      crateState.y -= crateState.vy * dt;
      crate.position.set(crateState.x, crateState.y, crateState.z);
      crate.rotation.y += dt * 0.5;
      if (crateState.y <= 8) {
        crateState.active = false;
        const dx = crateState.x - LAYOUT.pad.x, dz = crateState.z - LAYOUT.pad.z;
        if (dx * dx + dz * dz < 18 * 18) {
          state.score += 500;
          state.message = 'SUPPLY DELIVERED +500';
        } else {
          state.message = 'CRATE MISSED THE PAD';
        }
        state.messageTimer = 2.5;
      }
    }
    // Landings: slow + on the ground + inside a strip rectangle.
    if (state.mission.id === 'hop' || state.mission.id === 'land') {
      const strips = state.mission.id === 'hop' ? LAYOUT.hopStrips : [LAYOUT.strip];
      for (const s of strips) {
        if (s._landed) continue;
        if (!state.plane.grounded || state.plane.speed > 35) continue;
        const dx = state.plane.x - s.x, dz = state.plane.z - s.z;
        const ch = Math.cos(s.heading), sh = Math.sin(s.heading);
        const lx = dx * ch - dz * sh, lz = dx * sh + dz * ch;
        const halfW = s === LAYOUT.strip ? 17 : 13;
        if (Math.abs(lx) < s.length / 2 && Math.abs(lz) < halfW) {
          s._landed = true;
          state.stripsLanded++;
          state.score += 400;
          state.message = 'LANDED +400';
          state.messageTimer = 2;
        }
      }
    }
  }

  return { rings, crate, crateState, dropCrate, nextRing, reset, update };
}
