// The bush plane: a real 3D Cessna built from Three.js primitives, grouped so it
// banks and pitches as one solid body. Physics are simple arcade flight.
import { LAYOUT } from './config.js';

const WHITE = 0xf5f2ea;
const RED = 0xd23b2e;
const DARK = 0x1a2a3a;

function std(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness: roughness ?? 0.55, metalness: metalness ?? 0.1 });
}

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildPlane() {
  const group = new THREE.Group();
  const white = std(WHITE);
  const red = std(RED);
  const dark = std(DARK, 0.25, 0.3);
  const tyre = std(0x222222, 0.9, 0);

  // Fuselage: tapered cylinder along Z (nose toward -Z), rounded nose, tail cone.
  const fus = mesh(new THREE.CylinderGeometry(1.05, 1.45, 6.4, 18), white, 0, 0, 0);
  fus.rotation.x = Math.PI / 2;
  group.add(fus);
  const nose = mesh(new THREE.SphereGeometry(1.05, 18, 12), white, 0, 0, -3.4);
  nose.scale.set(1, 1, 1.5);
  group.add(nose);
  const tail = mesh(new THREE.ConeGeometry(1.35, 2.6, 18), white, 0, 0.15, 4.2);
  tail.rotation.x = Math.PI / 2;
  group.add(tail);
  // Red cheatline stripe along both flanks.
  const stripeL = mesh(new THREE.BoxGeometry(0.12, 0.5, 5.6), red, -1.28, -0.1, -0.3);
  const stripeR = mesh(new THREE.BoxGeometry(0.12, 0.5, 5.6), red, 1.28, -0.1, -0.3);
  group.add(stripeL, stripeR);

  // High wing: two halves with slight dihedral, red tips, struts.
  const wingL = mesh(new THREE.BoxGeometry(6.8, 0.32, 2.3), white, -3.4, 1.35, -0.4);
  wingL.rotation.z = 0.06;
  const wingR = mesh(new THREE.BoxGeometry(6.8, 0.32, 2.3), white, 3.4, 1.35, -0.4);
  wingR.rotation.z = -0.06;
  const tipL = mesh(new THREE.BoxGeometry(0.7, 0.36, 2.3), red, -6.9, 1.56, -0.4);
  tipL.rotation.z = 0.06;
  const tipR = mesh(new THREE.BoxGeometry(0.7, 0.36, 2.3), red, 6.9, 1.56, -0.4);
  tipR.rotation.z = -0.06;
  group.add(wingL, wingR, tipL, tipR);
  const strutL = mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8), white, -2.6, 0.35, -0.4);
  strutL.rotation.z = 0.9;
  const strutR = mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8), white, 2.6, 0.35, -0.4);
  strutR.rotation.z = -0.9;
  group.add(strutL, strutR);

  // Canopy: dark tinted half-sphere ahead of the wing.
  const canopy = mesh(new THREE.SphereGeometry(1.0, 18, 12), dark, 0, 0.85, -1.9);
  canopy.scale.set(0.95, 0.75, 1.5);
  group.add(canopy);

  // Tail: horizontal stabilizer + vertical fin with a red tip.
  const stab = mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), white, 0, 0.35, 4.6);
  const fin = mesh(new THREE.BoxGeometry(0.22, 2.1, 1.7), white, 0, 1.2, 4.6);
  const finTip = mesh(new THREE.BoxGeometry(0.26, 0.5, 1.7), red, 0, 2.1, 4.6);
  group.add(stab, fin, finTip);

  // Prop: spinner cone + two blades + a translucent disc, all spinning.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -4.6);
  const spinner = mesh(new THREE.ConeGeometry(0.42, 1.0, 12), red, 0, 0, -0.4);
  spinner.rotation.x = -Math.PI / 2;
  const blade = mesh(new THREE.BoxGeometry(0.28, 4.4, 0.1), dark, 0, 0, 0);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
  );
  prop.add(spinner, blade, disc);
  group.add(prop);

  // Landing gear: two wheels + struts.
  const wheelL = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 14), tyre, -1.3, -1.7, -1.2);
  wheelL.rotation.z = Math.PI / 2;
  const wheelR = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 14), tyre, 1.3, -1.7, -1.2);
  wheelR.rotation.z = Math.PI / 2;
  const gearL = mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 8), white, -1.3, -1.1, -1.2);
  const gearR = mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 8), white, 1.3, -1.1, -1.2);
  group.add(wheelL, wheelR, gearL, gearR);

  // Navigation lights: red left, green right, white tail (blinking).
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  navL.position.set(-7.2, 1.56, -0.4);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
  navR.position.set(7.2, 1.56, -0.4);
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLight.position.set(0, 0.4, 5.4);
  group.add(navL, navR, tailLight);

  return { group, prop, tailLight };
}

// ---- flight state + arcade physics ----

export function createPlaneState() {
  const s = LAYOUT.start;
  return {
    x: s.x, y: s.y, z: s.z, heading: s.heading,
    pitch: 0, roll: 0, speed: 42, throttle: 0.62,
    fuel: 100, damage: 0, vy: 0, grounded: false,
  };
}

export function resetPlane(p) {
  const s = LAYOUT.start;
  p.x = s.x; p.y = s.y; p.z = s.z; p.heading = s.heading;
  p.pitch = 0; p.roll = 0; p.speed = 42; p.throttle = 0.62;
  p.fuel = 100; p.damage = 0; p.vy = 0; p.grounded = false;
}

export function updatePlane(p, input, dt) {
  const MAX_SPEED = 62;
  if (input.throttleUp) p.throttle = Math.min(1, p.throttle + dt * 0.5);
  if (input.throttleDown) p.throttle = Math.max(0, p.throttle - dt * 0.5);
  const target = p.throttle * MAX_SPEED;
  p.speed += (target - p.speed) * Math.min(1, dt * 0.6);
  // Pitch / roll, easing back to level when no input.
  if (input.pitchUp) p.pitch = Math.min(0.45, p.pitch + 0.55 * dt);
  if (input.pitchDown) p.pitch = Math.max(-0.45, p.pitch - 0.55 * dt);
  if (!input.pitchUp && !input.pitchDown) p.pitch *= Math.max(0, 1 - dt * 1.5);
  if (input.rollLeft) p.roll = Math.min(0.9, p.roll + 1.4 * dt);
  if (input.rollRight) p.roll = Math.max(-0.9, p.roll - 1.4 * dt);
  if (!input.rollLeft && !input.rollRight) p.roll *= Math.max(0, 1 - dt * 1.8);
  // Banked turn + a little direct yaw.
  p.heading += -p.roll * 0.55 * dt;
  if (input.yawLeft) p.heading += 0.4 * dt;
  if (input.yawRight) p.heading -= 0.4 * dt;
  // Move along the heading.
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const sh = Math.sin(p.heading), ch = Math.cos(p.heading);
  p.vy = sp * p.speed;
  p.x += sh * cp * p.speed * dt;
  p.z += -ch * cp * p.speed * dt;
  p.y += p.vy * dt;
  // Ceiling and sea floor.
  if (p.y > 420) { p.y = 420; p.pitch = Math.min(p.pitch, 0); }
  if (p.y < 2.5) { p.y = 2.5; p.grounded = true; } else { p.grounded = false; }
  p.fuel = Math.max(0, p.fuel - dt * (0.25 + p.throttle * 0.55));
  return p;
}

export function applyPlaneTransform(planeObj, p, time) {
  planeObj.group.position.set(p.x, p.y, p.z);
  // Nose points -Z; rotation.y = -heading makes the model match the physics forward.
  planeObj.group.rotation.set(p.pitch, -p.heading, p.roll, 'YXZ');
  planeObj.prop.rotation.z += 0.35;
  planeObj.tailLight.visible = (Math.floor(time * 2) % 2 === 0);
}
