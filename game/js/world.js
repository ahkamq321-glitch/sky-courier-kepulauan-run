// The 3D bay: golden-hour sky, teal sea with waves, karst towers, islands with
// palms, a lighthouse, runways and hazy mountains. Real depth: near / mid / far.
import { LAYOUT } from './config.js';

function std(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness: roughness ?? 0.9, metalness: metalness ?? 0 });
}

export function buildWorld(scene) {
  // --- sky: gradient dome (orange horizon -> pink -> purple top) ---
  const skyGeo = new THREE.SphereGeometry(3200, 24, 16);
  const colors = [];
  const pos = skyGeo.attributes.position;
  const top = new THREE.Color(0x3a1a5e);
  const mid = new THREE.Color(0xc94a6a);
  const hor = new THREE.Color(0xff7a20);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 3200;
    let c;
    if (y > 0.25) c = mid.clone().lerp(top, (y - 0.25) / 0.75);
    else c = hor.clone().lerp(mid, (y + 0.15) / 0.4);
    colors.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xd76a5a, 1200, 3600);

  // --- lights: low warm sun (casts shadows) + soft sky/ground fill ---
  const sunDir = LAYOUT.sunDir;
  const sun = new THREE.DirectionalLight(0xffb36b, 1.35);
  sun.position.set(sunDir.x * 1200, sunDir.y * 1200, sunDir.z * 1200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.near = 100; sun.shadow.camera.far = 3000;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xd98aa8, 0x1f7f86, 0.55));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  // --- sun disc + glow sprite, low on the horizon ---
  const sunPos = new THREE.Vector3(sunDir.x * 2900, sunDir.y * 2900 + 60, sunDir.z * 2900);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(170, 32), new THREE.MeshBasicMaterial({ color: 0xffb03a, fog: false }));
  disc.position.copy(sunPos);
  disc.lookAt(0, 60, 0);
  scene.add(disc);
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256; glowCanvas.height = 256;
  const g = glowCanvas.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 200, 120, 0.85)');
  grad.addColorStop(0.4, 'rgba(255, 160, 90, 0.35)');
  grad.addColorStop(1, 'rgba(255, 160, 90, 0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false }));
  glow.scale.set(1400, 1400, 1);
  glow.position.copy(sunPos);
  scene.add(glow);

  // --- sea: big plane with baked sine waves, teal, glossy for sun glitter ---
  const seaGeo = new THREE.PlaneGeometry(6000, 6000, 72, 72);
  seaGeo.rotateX(-Math.PI / 2);
  const sp = seaGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getZ(i);
    sp.setY(i, Math.sin(x * 0.02) * 1.1 + Math.cos(z * 0.017 + x * 0.011) * 1.3 + Math.sin((x + z) * 0.008) * 0.9);
  }
  seaGeo.computeVertexNormals();
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x1b7f8c, roughness: 0.22, metalness: 0.55 }));
  sea.receiveShadow = true;
  scene.add(sea);
  // Boats, buoys and whitecaps — break up the flat sea so it reads as water.
  const boatHull = std(0x8a4a2a, 0.8, 0);
  const boatSail = std(0xf5f2ea, 0.9, 0);
  const buoyMat = new THREE.MeshBasicMaterial({ color: 0xff7a20 });
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
  const boatSpots = [
    { x: -260, z: 180, h: 0.6, s: 1 }, { x: 320, z: -140, h: -0.9, s: 1.3 },
    { x: -80, z: -420, h: 2.2, s: 0.9 },
  ];
  for (const b of boatSpots) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(10 * b.s, 3 * b.s, 4 * b.s), boatHull);
    hull.position.y = 1.5 * b.s; hull.castShadow = true;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12 * b.s, 6), std(0x5a3a22, 0.9, 0));
    mast.position.y = 8 * b.s;
    const sail = new THREE.Mesh(new THREE.ConeGeometry(4 * b.s, 10 * b.s, 4), boatSail);
    sail.position.set(0, 12 * b.s, -1 * b.s); sail.rotation.y = Math.PI / 4;
    boat.add(hull, mast, sail);
    boat.position.set(b.x, 1, b.z);
    boat.rotation.y = b.h;
    scene.add(boat);
  }
  for (const [bx, bz] of [[-140, 320], [180, 260], [60, -320], [-340, -80]]) {
    const buoy = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), buoyMat);
    buoy.position.set(bx, 2, bz);
    scene.add(buoy);
  }
  for (const [fx, fz, fr] of [[-200, 100, 26], [240, -60, 30], [40, 200, 22], [-60, -180, 28]]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(fr, 20), foamMat);
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(fx, 2, fz);
    scene.add(cap);
  }
  // Sun glitter path: a long soft streak on the water under the sun.
  const streakCanvas = document.createElement('canvas');
  streakCanvas.width = 512; streakCanvas.height = 128;
  const sg = streakCanvas.getContext('2d');
  sg.save();
  sg.translate(256, 64); sg.scale(4, 1);
  const sgrad = sg.createRadialGradient(0, 0, 0, 0, 0, 64);
  sgrad.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
  sgrad.addColorStop(0.5, 'rgba(255, 190, 110, 0.35)');
  sgrad.addColorStop(1, 'rgba(255, 190, 110, 0)');
  sg.fillStyle = sgrad;
  sg.fillRect(-64, -64, 128, 128);
  sg.restore();
  const streakTex = new THREE.CanvasTexture(streakCanvas);
  const glitter = new THREE.Mesh(
    new THREE.PlaneGeometry(2600, 420),
    new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glitter.geometry.rotateX(-Math.PI / 2);
  glitter.position.set(sunDir.x * 900, 1.5, sunDir.z * 900);
  glitter.rotation.y = Math.atan2(-sunDir.z, sunDir.x);
  scene.add(glitter);

  // --- shared materials ---
  const sand = std(0xe8d29a, 1, 0);
  const grass = std(0x4d8a44, 1, 0);
  const rockA = std(0xb98a68, 1, 0);
  const rockB = std(0x7a5570, 1, 0);
  const shrub = std(0x3f7a3a, 1, 0);
  const trunkMat = std(0x7a5230, 1, 0);
  const leafMat = std(0x2f7a33, 0.9, 0);

  function palm(x, y, z, s) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.8 * s, 9 * s, 7), trunkMat);
    trunk.position.y = 4.5 * s; trunk.castShadow = true;
    p.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 7 * s, 6), leafMat);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 2.6 * s, 9.5 * s, Math.sin(a) * 2.6 * s);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      leaf.castShadow = true;
      p.add(leaf);
    }
    p.position.set(x, y, z);
    return p;
  }

  // --- karst towers: tapered rock columns with green caps, casting shadows ---
  LAYOUT.karst.forEach((k, idx) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(k.r * 0.45, k.r, k.h, 10), idx % 2 === 0 ? rockA : rockB);
    tower.position.set(k.x, k.h / 2 - 4, k.z);
    tower.castShadow = true; tower.receiveShadow = true;
    scene.add(tower);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(k.r * 0.72, k.r * 0.78, k.h * 0.14, 10), std(0x8a6a52, 1, 0));
    band.position.set(k.x, k.h * 0.55 - 4, k.z);
    scene.add(band);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(k.r * 0.55, 10, 8), shrub);
    cap.scale.y = 0.45;
    cap.position.set(k.x, k.h - 2, k.z);
    cap.castShadow = true;
    scene.add(cap);
  });

  // --- round islands: flat-topped sand + grass, foam ring, palms ---
  // (Skip the spots that carry a hop strip — the strip platform is the island there.)
  const stripSpots = LAYOUT.hopStrips;
  for (const isl of LAYOUT.islands) {
    if (stripSpots.some(h => Math.abs(h.x - isl.x) < 5 && Math.abs(h.z - isl.z) < 5)) continue;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(isl.r, isl.r * 1.08, 4, 20), sand);
    rim.position.set(isl.x, 2, isl.z);
    rim.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(isl.r * 0.96, isl.r * 0.98, 2.5, 20), grass);
    top.position.set(isl.x, 5, isl.z);
    top.receiveShadow = true;
    const foam = new THREE.Mesh(new THREE.RingGeometry(isl.r * 1.05, isl.r * 1.3, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(isl.x, 0.8, isl.z);
    scene.add(rim, top, foam);
    scene.add(palm(isl.x + isl.r * 0.3, 6.2, isl.z + isl.r * 0.2, 1.2));
    scene.add(palm(isl.x - isl.r * 0.35, 6.2, isl.z - isl.r * 0.25, 1.0));
  }

  // --- lighthouse island (flat top), lighthouse, landing pad ---
  const li = LAYOUT.lighthouseIsland;
  const liRim = new THREE.Mesh(new THREE.CylinderGeometry(li.r, li.r * 1.08, 4, 24), sand);
  liRim.position.set(li.x, 2, li.z);
  liRim.receiveShadow = true;
  const liTop = new THREE.Mesh(new THREE.CylinderGeometry(li.r * 0.96, li.r * 0.98, 2.5, 24), grass);
  liTop.position.set(li.x, 5, li.z);
  liTop.receiveShadow = true;
  const liFoam = new THREE.Mesh(new THREE.RingGeometry(li.r * 1.05, li.r * 1.3, 28),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
  liFoam.rotation.x = -Math.PI / 2;
  liFoam.position.set(li.x, 0.8, li.z);
  scene.add(liRim, liTop, liFoam);
  // Beach hut + wooden dock on the lighthouse island.
  const hut = new THREE.Group();
  const hutBase = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), std(0xc9a06a, 1, 0));
  hutBase.position.y = 3; hutBase.castShadow = true;
  const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(8, 5, 4), std(0x8a4a2a, 1, 0));
  hutRoof.position.y = 8.5; hutRoof.rotation.y = Math.PI / 4; hutRoof.castShadow = true;
  hut.add(hutBase, hutRoof);
  hut.position.set(li.x + 38, 6.2, li.z - 42);
  scene.add(hut);
  const dock = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 8), std(0x7a5230, 1, 0));
    plank.position.set(0, 1, i * 9);
    dock.add(plank);
  }
  dock.position.set(li.x - 65, 2.5, li.z + 55);
  dock.rotation.y = 0.5;
  scene.add(dock);
  scene.add(palm(li.x - 50, 6.2, li.z + 40, 1.4));
  scene.add(palm(li.x + 55, 6.2, li.z + 30, 1.2));
  // Lighthouse: stacked red/white bands, dark lamp room, glowing lamp.
  const lh = new THREE.Group();
  const bandH = 12;
  for (let i = 0; i < 4; i++) {
    const rTop = 4.4 - i * 0.45, rBot = 4.9 - i * 0.45;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, bandH, 14),
      i % 2 === 0 ? std(0xd23b2e, 0.7, 0) : std(0xf5f2ea, 0.7, 0));
    band.position.y = i * bandH + bandH / 2;
    band.castShadow = true;
    lh.add(band);
  }
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 5, 12), std(0x222831, 0.4, 0.4));
  lampRoom.position.y = 4 * bandH + 2.5;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  lamp.position.y = 4 * bandH + 2.5;
  const capTop = new THREE.Mesh(new THREE.ConeGeometry(4.4, 4, 12), std(0x222831, 0.5, 0.3));
  capTop.position.y = 4 * bandH + 7;
  lh.add(lampRoom, lamp, capTop);
  lh.position.set(LAYOUT.lighthouse.x, 6.2, LAYOUT.lighthouse.z);
  scene.add(lh);
  // Landing pad: dark circle with a white ring, beside the lighthouse.
  const pad = new THREE.Mesh(new THREE.CircleGeometry(16, 28), std(0x2c2c34, 0.9, 0));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(LAYOUT.pad.x, 6.4, LAYOUT.pad.z);
  pad.receiveShadow = true;
  const padRing = new THREE.Mesh(new THREE.RingGeometry(12, 15, 28), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(LAYOUT.pad.x, 6.5, LAYOUT.pad.z);
  scene.add(pad, padRing);

  // --- runways: sand platform + asphalt + centre line + threshold bars ---
  function buildStrip(x, z, heading, length, width) {
    const g = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.BoxGeometry(length + 50, 4, width + 26), sand);
    platform.position.y = 2;
    platform.receiveShadow = true;
    g.add(platform);
    const surface = new THREE.Mesh(new THREE.BoxGeometry(length, 1, width * 0.55), std(0x2c2c34, 0.95, 0));
    surface.position.y = 4.4;
    surface.receiveShadow = true;
    g.add(surface);
    const centre = new THREE.Mesh(new THREE.BoxGeometry(length * 0.9, 0.3, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    centre.position.y = 5.0;
    g.add(centre);
    for (const s of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, width * 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      bar.position.set(s * (length / 2 - 8), 5.0, 0);
      g.add(bar);
    }
    g.position.set(x, 0, z);
    g.rotation.y = heading;
    scene.add(g);
    return g;
  }
  buildStrip(LAYOUT.strip.x, LAYOUT.strip.z, LAYOUT.strip.heading, LAYOUT.strip.length, 34);
  // Windsock at the main strip: pole + orange cone.
  const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 26, 8), std(0xdddddd, 0.6, 0.4));
  sockPole.position.set(LAYOUT.strip.x + 40, 13, LAYOUT.strip.z + 30);
  sockPole.castShadow = true;
  const sock = new THREE.Mesh(new THREE.ConeGeometry(3, 12, 10), std(0xff7a20, 0.8, 0));
  sock.rotation.z = Math.PI / 2 - 0.25;
  sock.position.set(LAYOUT.strip.x + 46, 25, LAYOUT.strip.z + 30);
  sock.castShadow = true;
  scene.add(sockPole, sock);
  for (const h of LAYOUT.hopStrips) buildStrip(h.x, h.z, h.heading, h.length, 26);

  // --- mountains: big dark cones far away, hazed by the fog ---
  const mtnMat = std(0x7a5a8a, 1, 0);
  for (const m of LAYOUT.mountains) {
    const h = m.h * 0.55;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(m.r, h, 7), mtnMat);
    cone.position.set(m.x, h / 2 - 30, m.z);
    scene.add(cone);
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(m.r * 0.6, h * 0.75, 7), mtnMat);
    cone2.position.set(m.x + m.r * 0.7, h * 0.375 - 30, m.z + 100);
    scene.add(cone2);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(m.r * 0.34, h * 0.32, 7), std(0xffffff, 0.9, 0));
    snow.position.set(m.x, h * 0.84 - 30, m.z);
    scene.add(snow);
  }

  // --- clouds: clusters of flattened cream spheres, drifting slowly ---
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffe8d8, roughness: 1, metalness: 0, emissive: 0x604040, emissiveIntensity: 0.25 });
  const clouds = [];
  const cloudSpots = [
    { x: -600, y: 320, z: -800, s: 1.6 }, { x: 500, y: 380, z: -1200, s: 2.0 },
    { x: -200, y: 300, z: 600, s: 1.3 }, { x: 900, y: 340, z: 300, s: 1.8 },
    { x: -1200, y: 360, z: 200, s: 2.2 }, { x: 100, y: 420, z: -1800, s: 2.4 },
    { x: -800, y: 300, z: -1600, s: 1.5 }, { x: 1400, y: 380, z: -600, s: 1.7 },
  ];
  for (const c of cloudSpots) {
    const g = new THREE.Group();
    const puffs = [[0, 0, 0, 60], [55, -8, 10, 44], [-55, -6, -8, 48], [20, 14, -12, 40], [-25, 12, 12, 38]];
    for (const [px, py, pz, pr] of puffs) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(pr, 12, 10), cloudMat);
      s.position.set(px * c.s, py * c.s, pz * c.s);
      s.scale.y = 0.55;
      g.add(s);
    }
    g.position.set(c.x, c.y, c.z);
    scene.add(g);
    clouds.push(g);
  }
  // Birds: small dark V shapes drifting over the bay (static — screenshots are frozen).
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2a2a3a });
  for (let i = 0; i < 6; i++) {
    const bird = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 1.0), birdMat);
    w1.rotation.z = 0.5; w1.position.x = -2.0;
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 1.0), birdMat);
    w2.rotation.z = -0.5; w2.position.x = 2.0;
    bird.add(w1, w2);
    bird.position.set(-500 + i * 220, 175 + (i % 3) * 18, -100 + (i % 2) * 300);
    scene.add(bird);
  }

  return {
    update(dt, t, planePos) {
      for (const c of clouds) {
        c.position.x += dt * 2;
        if (c.position.x > 2200) c.position.x = -2200;
      }
      // Keep the shadow frustum centred on the plane.
      sun.position.set(planePos.x + sunDir.x * 1200, planePos.y + sunDir.y * 1200 + 80, planePos.z + sunDir.z * 1200);
      sun.target.position.set(planePos.x, planePos.y, planePos.z);
      sun.target.updateMatrixWorld();
      glitter.material.opacity = 0.42 + Math.sin(t * 0.7) * 0.08;
    },
  };
}
