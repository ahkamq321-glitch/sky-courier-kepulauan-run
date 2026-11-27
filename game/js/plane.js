// The courier plane: a solid 3D Cessna-style high-wing bush plane built from primitives.
// One THREE.Group so it banks and pitches as a single body. Casts a real shadow.
import { WEATHER } from './config.js';

const WHITE = 0xf2ede2, RED = 0xc22e2e, DARK = 0x22262e, GLASS = 0x1a2a3a;

export function buildPlane(weather) {
  const g = new THREE.Group();
  const mat = (c, r = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05, ...extra });
  const white = mat(WHITE), red = mat(RED), dark = mat(DARK), glass = mat(GLASS, 0.25, { metalness: 0.4 });

  // Fuselage: tapered cylinder along Z, nose forward (-Z), plus a rounded nose cap.
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.62, 7.4, 14), white);
  fus.rotation.x = Math.PI / 2;
  fus.position.set(0, 0, 0.4);
  g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), white);
  nose.scale.set(1, 1, 0.7);
  nose.position.set(0, 0, -3.3);
  g.add(nose);
  // Red cheatline stripe along the fuselage.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.34, 6.6), red);
  stripe.position.set(0, -0.18, 0.4);
  g.add(stripe);
  // Tail cone.
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.16, 2.6, 10), white);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.25, 5.0);
  g.add(tail);

  // High wing: long flat box with red wingtips and a slight dihedral.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.22, 1.9), white);
  wing.position.set(0, 1.05, -0.6);
  wing.rotation.z = 0.045;
  g.add(wing);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 1.9), red);
  tipL.position.set(-5.05, 1.28, -0.6);
  g.add(tipL);
  const tipR = tipL.clone();
  tipR.position.x = 5.05;
  g.add(tipR);
  // Wing panel seams — thin dark lines so the wing reads as built, not flat.
  for (const sx of [-4.2, -2.6, 2.6, 4.2]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 1.86), dark);
    seam.position.set(sx, 1.17, -0.6);
    g.add(seam);
  }

  // Canopy: dark-tinted half-sphere over the cabin.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.position.set(0, 0.55, -1.1);
  canopy.scale.set(1, 0.85, 1.5);
  g.add(canopy);
  // Tail: horizontal stabilizer with red tips + vertical fin with red tip.
  const stab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.0), white);
  stab.position.set(0, 0.35, 5.9);
  g.add(stab);
  for (const sx of [-1.7, 1.7]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 1.0), red);
    st.position.set(sx, 0.35, 5.9);
    g.add(st);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 1.4), white);
  fin.position.set(0, 1.0, 5.9);
  g.add(fin);
  const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 1.0), red);
  finTip.position.set(0, 1.95, 5.9);
  g.add(finTip);
  // Dorsal antenna.
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.7, 6), dark);
  ant.position.set(0, 1.25, 1.6);
  g.add(ant);
  // Pitot tube under the left wing + a cabin step.
  const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), dark);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(-3.4, 0.9, -1.2);
  g.add(pitot);
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.3), dark);
  step.position.set(-1.15, -0.85, 0.8);
  g.add(step);
  // Landing gear: two wheels + struts.
  for (const sx of [-0.9, 0.9]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), dark);
    strut.position.set(sx, -1.0, -0.9);
    g.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx, -1.6, -0.9);
    g.add(wheel);
  }

  // Prop: spinning X blades + translucent blur disc + red spinner cone + warm glow.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -4.05);
  const bladeMat = mat(0x2a2e36, 0.4);
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.1), bladeMat);
    blade.rotation.z = a;
    prop.add(blade);
  }
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  prop.add(disc);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.0, 12), red);
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.z = -0.3;
  prop.add(spinner);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.3, 20),
    new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  );
  glow.position.z = 0.15;
  prop.add(glow);
  g.add(prop);

  // Nav lights: red left, green right, blinking white tail.
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  navL.position.set(-5.3, 1.15, -0.6);
  g.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2aff66 }));
  navR.position.set(5.3, 1.15, -0.6);
  g.add(navR);
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLight.position.set(0, 0.3, 6.35);
  g.add(tailLight);

  // Speed lines: stretched translucent planes streaming past at high throttle.
  const speedLines = new THREE.Group();
  const slMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.6), slMat);
    const a = (i / 10) * Math.PI * 2;
    line.position.set(Math.cos(a) * 7, Math.sin(a) * 4 + 0.5, -2 + (i % 3) * 2.5);
    line.rotation.y = Math.PI / 2;
    speedLines.add(line);
  }
  g.add(speedLines);

  // Cockpit frame for the cockpit camera: dashboard + side pillars, NO centre pillar.
  const cockpit = new THREE.Group();
  const dash = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.5), mat(0x1a1d22, 0.9));
  dash.position.set(0, -0.15, -2.6);
  cockpit.add(dash);
  for (const sx of [-1.5, 1.5]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.22), mat(0x1a1d22, 0.9));
    pillar.position.set(sx, 0.3, -2.5);
    cockpit.add(pillar);
  }
  g.add(cockpit);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return { group: g, prop, tailLight, speedLines };
}

export function updatePlane(plane, dt, t, throttle) {
  plane.prop.rotation.z -= dt * (6 + throttle * 22);
  plane.tailLight.visible = (t % 1.2) < 0.7;
  plane.speedLines.visible = throttle > 0.55;
  plane.speedLines.children.forEach((l, i) => {
    l.position.z += dt * 14;
    if (l.position.z > 3) l.position.z = -5;
  });
}
