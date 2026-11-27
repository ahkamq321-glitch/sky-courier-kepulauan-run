// The karst bay: sea, karst towers, islands, lighthouse, runway, mountains, sky, clouds.
// One deterministic world (seeded RNG) with near / mid / far depth. Weather variants:
// DUSK golden hour, STORM grey + rain, NIGHT dark + stars + lighthouse beam.
import { WEATHER, mulberry32 } from './config.js';

function skyTexture(w) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  g.addColorStop(0, hex(w.skyTop));
  g.addColorStop(0.45, hex(w.skyMid));
  g.addColorStop(0.75, hex(w.horizon));
  g.addColorStop(1, hex(w.horizon));
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(weatherKey) {
  const w = WEATHER[weatherKey] || WEATHER.DUSK;
  const night = weatherKey === 'NIGHT';
  const storm = weatherKey === 'STORM';
  const g = new THREE.Group();
  const rnd = mulberry32(20261127);
  const mat = (c, r = 0.9, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.0, ...extra });

  // Sky dome: big sphere with a vertical gradient texture, seen from inside.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1900, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(w), side: THREE.BackSide, fog: false }),
  );
  g.add(sky);
  // Fog for depth, matched to the horizon colour.
  const fog = new THREE.Fog(w.fog, 260, 1500);

  // Sun: bright emissive disc low on the horizon + a soft glow sprite.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(night ? 26 : 46, 24),
    new THREE.MeshBasicMaterial({ color: w.sunColor, fog: false }),
  );
  sun.position.set(w.sunPos[0], w.sunPos[1], w.sunPos[2]);
  sun.lookAt(0, 60, 0);
  g.add(sun);
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,220,160,0.9)');
    gr.addColorStop(0.4, 'rgba(255,170,90,0.35)');
    gr.addColorStop(1, 'rgba(255,150,60,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false }));
  glow.scale.set(420, 420, 1);
  glow.position.copy(sun.position);
  g.add(glow);

  // Lights: warm directional sun (casts shadows) + hemisphere fill.
  const sunLight = new THREE.DirectionalLight(w.light, w.lightIntensity);
  sunLight.position.set(w.sunPos[0] * 0.4, Math.max(120, w.sunPos[1] * 1.6), w.sunPos[2] * 0.4 + 300);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -160; sunLight.shadow.camera.right = 160;
  sunLight.shadow.camera.top = 160; sunLight.shadow.camera.bottom = -160;
  sunLight.shadow.camera.far = 1600;
  g.add(sunLight);
  g.add(new THREE.HemisphereLight(w.hemiSky, w.hemiGround, night ? 0.55 : 0.75));
  if (!night) g.add(new THREE.AmbientLight(w.ambient, 0.25));

  // Sea: large plane with gentle sine-wave displacement + sun glitter.
  const seaGeo = new THREE.PlaneGeometry(4000, 4000, 48, 48);
  const pos = seaGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.012) * 1.6 + Math.cos(y * 0.017) * 1.4 + Math.sin((x + y) * 0.006) * 1.1);
  }
  seaGeo.computeVertexNormals();
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: w.sea, roughness: 0.35, metalness: 0.35 }));
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  g.add(sea);
  // Sun-glitter path on the water under the low sun.
  const glitter = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 900),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: night ? 0.0 : 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glitter.rotation.x = -Math.PI / 2;
  glitter.position.set(-180, 4.6, -450);
  g.add(glitter);

  // Karst towers: tall cones framing the flight path left and right, with strata bands.
  const karstMat = mat(0x9a7a5e, 1.0);
  const karstDark = mat(0x6e5340, 1.0);
  const shrubMat = mat(0x3a7a3a, 1.0);
  const towers = [];
  const towerSpots = [
    [-98, -30, 72, 26], [92, -60, 82, 30], [-105, -140, 95, 34], [98, -180, 78, 28],
    [-88, -260, 66, 24], [95, -300, 88, 32], [-100, -380, 75, 26], [98, -440, 68, 24],
    [-85, -520, 60, 22], [92, -580, 72, 26],
  ];
  for (const [tx, tz, th, tr] of towerSpots) {
    const tower = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.22, tr, th, 16), karstMat);
    cone.position.y = th / 2;
    cone.castShadow = true;
    cone.receiveShadow = true;
    tower.add(cone);
    // Rock strata: thin darker rings around the tower.
    for (let s = 1; s <= 5; s++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(tr * (0.72 - s * 0.12), tr * (0.78 - s * 0.12), 2.2, 10), karstDark);
      band.position.y = (th * s) / 6;
      tower.add(band);
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(tr * 0.3, th * 0.16, 8), shrubMat);
    cap.position.y = th + th * 0.06;
    tower.add(cap);
    // Shrub blobs on the tower flanks so the rock is not a bare cone.
    for (let b = 0; b < 2; b++) {
      const blob = new THREE.Mesh(new THREE.SphereGeometry(tr * 0.16, 7, 5), shrubMat);
      const ba = rnd() * Math.PI * 2;
      blob.position.set(Math.cos(ba) * tr * 0.55, th * (0.3 + b * 0.35), Math.sin(ba) * tr * 0.55);
      blob.scale.y = 0.6;
      tower.add(blob);
    }
    tower.position.set(tx, 0, tz);
    tower.rotation.z = (rnd() - 0.5) * 0.06;
    g.add(tower);
    towers.push(tower);
  }
  // Foam rings where the towers meet the sea.
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  for (const [tx, tz, th, tr] of towerSpots) {
    const foam = new THREE.Mesh(new THREE.RingGeometry(tr * 1.02, tr * 1.25, 20), foamMat);
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(tx, 2.4, tz);
    g.add(foam);
  }

  // Islands: flattened cylinders with sand rims, green tops and palm trees.
  function island(x, z, r, withPalms) {
    const isl = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 6, 18), mat(0xd8c08a, 1.0));
    base.position.y = 1;
    base.receiveShadow = true;
    isl.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.98, 2.5, 18), mat(0x3f7a44, 1.0));
    top.position.y = 4.5;
    top.receiveShadow = true;
    isl.add(top);
    if (withPalms) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        const px = Math.cos(a) * r * 0.55, pz = Math.sin(a) * r * 0.55;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), mat(0x6e4a2a, 1.0));
        trunk.position.set(px, 10, pz);
        trunk.rotation.z = 0.15;
        isl.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), mat(0x2a6a2a, 1.0));
        crown.scale.set(1.6, 0.6, 1.6);
        crown.position.set(px + 1, 15, pz);
        isl.add(crown);
      }
    }
    isl.position.set(x, 0, z);
    g.add(isl);
    return isl;
  }
  island(-95, -40, 26, true);
  island(95, -260, 30, true);
  island(-110, -330, 22, false);
  island(120, 60, 20, true);

  // Lighthouse island: big island with the red-white lighthouse, landing pad, beach hut,
  // wooden dock and windsock. The lighthouse sits RIGHT of the flight path (x +58).
  const lightIsland = island(58, -150, 34, false);
  const lh = new THREE.Group();
  const bandMat = (c) => mat(c, 0.7);
  let lhY = 5;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(4.6 - i * 0.55, 5.2 - i * 0.55, 7, 12), bandMat(i % 2 ? 0xc22e2e : 0xf2ede2));
    seg.position.y = lhY + 3.5;
    seg.castShadow = true;
    lh.add(seg);
    lhY += 7;
  }
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 4, 12), mat(0x22262e, 0.5));
  lampRoom.position.y = lhY + 2;
  lh.add(lampRoom);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(night ? 2.8 : 2.2, 12, 8),
    new THREE.MeshBasicMaterial({ color: night ? 0xfff2b0 : 0xffe9a0 }),
  );
  lamp.position.y = lhY + 2;
  lh.add(lamp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 3.4, 12), mat(0x22262e, 0.6));
  roof.position.y = lhY + 5.5;
  lh.add(roof);
  // Gallery railing + lit windows so the lighthouse reads as a building, not a striped cone.
  const rail = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.12, 6, 16), mat(0x22262e, 0.6));
  rail.rotation.x = Math.PI / 2;
  rail.position.y = lhY + 0.4;
  lh.add(rail);
  for (let wi = 0; wi < 3; wi++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.2), new THREE.MeshBasicMaterial({ color: night ? 0xffe9a0 : 0x1a2a3a }));
    win.position.set(0, 9 + wi * 7, 4.9 - wi * 0.5);
    lh.add(win);
  }
  lh.position.set(0, 0, 0);
  lightIsland.add(lh);
  // Rotating beam: a spotlight + a visible translucent cone.
  const beam = new THREE.SpotLight(0xfff2b0, night ? 4.0 : 0.0, 900, 0.22, 0.45, 0.6);
  beam.position.set(58, lhY + 7, -150);
  beam.target.position.set(58, 20, -400);
  g.add(beam);
  g.add(beam.target);
  const beamCone = new THREE.Mesh(
    new THREE.ConeGeometry(16, 260, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: night ? 0.22 : 0.0, side: THREE.DoubleSide, depthWrite: false }),
  );
  beamCone.rotation.x = Math.PI / 2 - 0.06;
  beamCone.position.set(58, lhY + 7, -280);
  g.add(beamCone);
  // Landing pad + supply crate + parachute (Mail Run detail, below-and-beside the lighthouse).
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1.2, 16), mat(0x3a3f46, 0.9));
  pad.position.set(58, 5.6, -118);
  pad.receiveShadow = true;
  g.add(pad);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), mat(0x8a6a3a, 0.9));
  crate.position.set(48, 8.5, -112);
  crate.castShadow = true;
  g.add(crate);
  const chute = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc22e2e, roughness: 0.7, side: THREE.DoubleSide }));
  dome.position.y = 30;
  chute.add(dome);
  const chuteCrate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 3.4), mat(0x8a6a3a, 0.9));
  chuteCrate.position.y = 22;
  chute.add(chuteCrate);
  chute.position.set(30, 52, -195);
  if (weatherKey === 'DUSK') g.add(chute); // Mail Run detail only — at night it reads as a stray red dome.
  // Beach hut (pyramid roof) + wooden dock on the lighthouse island.
  const hut = new THREE.Group();
  const hutBase = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 7), mat(0x9a7a52, 0.9));
  hutBase.position.y = 8;
  hut.add(hutBase);
  const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 4.5, 4), mat(0x6e4a2a, 0.9));
  hutRoof.position.y = 12.8;
  hutRoof.rotation.y = Math.PI / 4;
  hut.add(hutRoof);
  hut.position.set(74, 0, -132);
  g.add(hut);
  const dock = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 26), mat(0x6e4a2a, 0.9));
  dock.position.set(40, 4.5, -128);
  g.add(dock);

  // Runway: coastal strip on a flat island, with centre line + threshold marks + windsock.
  const strip = new THREE.Mesh(new THREE.BoxGeometry(16, 1.5, 230), mat(0x2e3238, 0.95));
  strip.position.set(0, 2.5, -60);
  strip.receiveShadow = true;
  g.add(strip);
  for (let i = 0; i < 9; i++) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    mark.position.set(0, 3.4, -160 + i * 25);
    g.add(mark);
  }
  // Runway edge lights so the strip reads in the cockpit approach shot.
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffc27a });
  for (let i = 0; i < 10; i++) {
    for (const ex of [-8, 8]) {
      const edge = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), edgeMat);
      edge.position.set(ex, 3.6, -170 + i * 25);
      g.add(edge);
    }
  }
  const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 6), mat(0x888888, 0.6));
  sockPole.position.set(14, 8, 20);
  g.add(sockPole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 8), mat(0xff7a1a, 0.7));
  sock.rotation.z = -Math.PI / 2;
  sock.position.set(18, 13.5, 20);
  g.add(sock);

  // Mountains: two far ridges of hazy purple cones with snow caps.
  const mtnMat = mat(night ? 0x1a2038 : 0x6a4a6a, 1.0);
  const snowMat = mat(0xe8e8f0, 0.9);
  for (let i = 0; i < 7; i++) {
    const mx = -700 + i * 230 + rnd() * 60;
    const mh = 220 + rnd() * 160;
    const m = new THREE.Mesh(new THREE.ConeGeometry(150 + rnd() * 80, mh, 7), mtnMat);
    m.position.set(mx, mh / 2 - 10, -1150 - rnd() * 150);
    g.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(52, 60, 7), snowMat);
    cap.position.set(mx, mh - 38, -1150 - rnd() * 150);
    g.add(cap);
  }

  // Clouds: groups of flattened white/cream spheres at several heights, drifting slowly.
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: w.cloud, roughness: 1, transparent: true, opacity: night ? 0.35 : 0.85 });
  for (let i = 0; i < 12; i++) {
    const cl = new THREE.Group();
    const n = 4 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(14 + rnd() * 16, 8, 6), cloudMat);
      s.scale.y = 0.45;
      s.position.set(j * 18 - n * 9, rnd() * 6, rnd() * 10 - 5);
      cl.add(s);
    }
    cl.position.set(-450 + rnd() * 900, 150 + rnd() * 90, -100 - rnd() * 700);
    clouds.add(cl);
  }
  g.add(clouds);

  // Birds: small dark V shapes in the sky.
  const birds = new THREE.Group();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), birdMat);
      wing.position.x = s * 1.6;
      wing.rotation.z = s * 0.5;
      b.add(wing);
    }
    b.position.set(-120 + i * 45, 175 + (i % 3) * 12, -80 - i * 40);
    birds.add(b);
  }
  g.add(birds);

  // Sea details: whitecaps, sailboats, orange buoys.
  const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 4; i++) {
    const wc = new THREE.Mesh(new THREE.CircleGeometry(9 + rnd() * 8, 10), capMat);
    wc.rotation.x = -Math.PI / 2;
    wc.position.set(-160 + i * 90, 2.2, 40 - i * 90);
    g.add(wc);
  }
  for (let i = 0; i < 3; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 9), mat(0xf2ede2, 0.6));
    hull.position.y = 1.5;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 11, 6), mat(0x6e4a2a, 0.8));
    mast.position.y = 7;
    boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(5, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }));
    sail.position.set(0, 8, -1.5);
    boat.add(sail);
    boat.position.set(-140 + i * 130, 1, 90 - i * 130);
    boat.rotation.y = rnd() * 1.2 - 0.6;
    g.add(boat);
  }
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.6 });
  for (const [bx, bz] of [[-30, 30], [34, -20], [-44, -120], [40, -240]]) {
    const buoy = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.5, 8), buoyMat);
    buoy.position.set(bx, 3.5, bz);
    g.add(buoy);
  }

  // Night extras: stars + moon glow.
  let stars = null;
  if (night) {
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for (let i = 0; i < 420; i++) {
      const a = rnd() * Math.PI * 2, e = 0.25 + rnd() * 1.1, r = 1500;
      starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, fog: false }));
    g.add(stars);
  }

  // Storm extras: rain streaks (thin lines falling).
  let rain = null;
  if (storm) {
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = [];
    for (let i = 0; i < 90; i++) {
      const x = -160 + rnd() * 320, y = 20 + rnd() * 130, z = 160 - rnd() * 420;
      rainPos.push(x, y, z, x, y - 9, z);
    }
    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
    rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb8c4cc, transparent: true, opacity: 0.5 }));
    g.add(rain);
  }

  return { group: g, fog, beam, beamCone, clouds, birds, rain, stars, lighthousePos: new THREE.Vector3(58, 34, -150) };
}

export function updateWorld(world, dt, t) {
  world.clouds.children.forEach((c, i) => {
    c.position.x += dt * (1.2 + (i % 3) * 0.5);
    if (c.position.x > 520) c.position.x = -520;
  });
  world.birds.children.forEach((b, i) => {
    b.position.x += dt * (2 + i * 0.3);
    if (b.position.x > 260) b.position.x = -260;
  });
  if (world.beam) {
    const a = t * 0.45;
    world.beam.target.position.set(58 + Math.cos(a) * 320, 18, -150 - Math.sin(a) * 320);
    if (world.beamCone) {
      world.beamCone.rotation.z = a;
      world.beamCone.rotation.x = Math.PI / 2 - 0.06;
    }
  }
  if (world.rain) {
    world.rain.position.y -= dt * 55;
    if (world.rain.position.y < -120) world.rain.position.y = 0;
  }
}
