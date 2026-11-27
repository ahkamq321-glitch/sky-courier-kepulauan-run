// Karst Bay Courier — boot, cameras, input and the game loop.
// Renders one deterministic scene from ?scene=chase|cockpit|missions|night (no input needed).
import { WEATHER, PLANE, START, RING, MISSIONS, clamp, lerp, nm } from './config.js';
import { resolveScene } from './screens.js';
import { buildPlane, updatePlane } from './plane.js';
import { buildWorld, updateWorld } from './world.js';
import { ringMeshes, createMissionState, updateRingVisuals, currentRing, checkRingPass, missionDialog } from './missions.js';
import { buildHUD, updateHUD, showScreen } from './hud.js';
import { completeText, crashText } from './screens.js';

const sceneDef = resolveScene();
const weatherKey = sceneDef.mission.weather;
const W = WEATHER[weatherKey];

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(1280, 720, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.5, 4000);

const world = buildWorld(weatherKey);
scene.add(world.group);
scene.fog = world.fog;

const planeObj = buildPlane(weatherKey);
scene.add(planeObj.group);

const state = createMissionState(sceneDef.mission, sceneDef.ringIndex);
const rings = ringMeshes(state.rings, sceneDef.mission);
scene.add(rings.group);
updateRingVisuals(state, rings.meshes);

const hud = buildHUD();

// Flight state: position, heading (rad, 0 = -Z), pitch, roll, speed.
const flight = {
  pos: new THREE.Vector3(START.x, START.y, START.z),
  heading: 0, pitch: 0, roll: 0, speed: PLANE.speed, throttle: 0.72,
  vsi: 0, crashed: false,
};

// Place the plane so the current ring sits ~55 units ahead, dead-centre, with the
// lighthouse island visible to the right. The cockpit scene puts the plane on the
// runway approach instead (runway straight ahead, low over the water).
function stageScene() {
  const r = currentRing(state);
  if (sceneDef.camera === 'cockpit') {
    flight.pos.set(0, 26, -20);
    flight.heading = 0;
    flight.pitch = -0.05;
    flight.roll = 0;
  } else {
    flight.pos.set(r.x, r.y + 2, r.z + RING.firstAhead);
    flight.heading = 0;
    flight.pitch = 0;
    flight.roll = 0;
  }
  planeObj.group.position.copy(flight.pos);
  planeObj.group.rotation.set(0, 0, 0);
}
stageScene();

let cameraMode = sceneDef.camera; // 'chase' | 'cockpit' | 'orbit'
let screen = sceneDef.overlay === 'menu' ? 'menu' : sceneDef.overlay === 'title' ? 'title' : 'flying';
if (sceneDef.overlay === 'hud') screen = 'flying';
showScreen(hud, screen === 'flying' ? 'none' : screen);
if (screen === 'flying') showScreen(hud, 'none');

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyC') cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  if (e.code === 'Enter' && screen === 'title') { screen = 'menu'; showScreen(hud, 'menu'); }
  if (e.code === 'KeyR') restart();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
hud.cardEls.forEach((card, i) => {
  card.querySelector('.card-start').addEventListener('click', () => startMission(i));
  card.addEventListener('click', () => startMission(i));
});

function startMission(i) {
  const m = MISSIONS[i];
  location.search = '?scene=' + (m.weather === 'NIGHT' ? 'night' : 'chase');
}

function restart() {
  location.reload();
}

// Cameras: chase DIRECTLY behind the plane on its axis (no sideways offset — the user
// complained the old camera was off-centre); cockpit at the pilot seat; orbit for menus.
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
function updateCamera(dt) {
  const p = flight.pos;
  if (cameraMode === 'cockpit') {
    camPos.set(p.x, p.y + 2.2, p.z - 0.5);
    camLook.set(p.x, p.y - 1, p.z - 80);
    camera.position.lerp(camPos, 1);
    camera.lookAt(camLook);
    return;
  }
  if (cameraMode === 'orbit') {
    const a = performance.now() * 0.00004;
    camPos.set(Math.cos(a) * 190, 95, 130 + Math.sin(a) * 190);
    if (camera.position.distanceTo(camPos) > 60) camera.position.copy(camPos);
    else camera.position.lerp(camPos, 1 - Math.pow(0.02, dt));
    camera.lookAt(0, 45, -120);
    return;
  }
  // Chase: 15 units behind, 3.2 above, on the plane's axis; lookAt AT the plane.
  // Snap when far (software rendering runs at low fps, so a lerp alone leaves the
  // camera behind and the plane tiny for the first seconds).
  const back = new THREE.Vector3(
    p.x - Math.sin(flight.heading) * 15,
    p.y + 3.2,
    p.z + Math.cos(flight.heading) * 15,
  );
  if (camera.position.distanceTo(back) > 30) camera.position.copy(back);
  else camera.position.lerp(back, 1 - Math.pow(0.001, dt));
  camLook.set(p.x, p.y + 0.5, p.z);
  camera.lookAt(camLook);
}

function commandFor(r) {
  const dy = r.y - flight.pos.y;
  if (dy < -4) return 'DESCEND 60 FT';
  if (dy > 4) return 'CLIMB 40 FT';
  const dx = r.x - flight.pos.x;
  if (dx < -6) return 'BANK LEFT';
  if (dx > 6) return 'BANK RIGHT';
  return 'HOLD ALTITUDE';
}

let last = performance.now();
let elapsed = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  const flying = screen === 'flying' && !state.done && !state.crashed;

  if (flying) {
    // Steering.
    if (keys['KeyA']) { flight.heading += PLANE.turnRate * dt; flight.roll = lerp(flight.roll, 0.55, dt * 4); }
    else if (keys['KeyD']) { flight.heading -= PLANE.turnRate * dt; flight.roll = lerp(flight.roll, -0.55, dt * 4); }
    else flight.roll = lerp(flight.roll, 0, dt * 3);
    if (keys['KeyW']) flight.pitch = lerp(flight.pitch, 0.28, dt * 3);
    else if (keys['KeyS']) flight.pitch = lerp(flight.pitch, -0.22, dt * 3);
    else flight.pitch = lerp(flight.pitch, 0, dt * 2);
    if (keys['ShiftLeft'] || keys['ShiftRight']) flight.throttle = clamp(flight.throttle + dt * 0.5, 0.3, 1);
    if (keys['ControlLeft'] || keys['ControlRight']) flight.throttle = clamp(flight.throttle - dt * 0.5, 0.3, 1);
    flight.speed = lerp(PLANE.minSpeed, PLANE.maxSpeed, flight.throttle);
    const prevY = flight.pos.y;
    flight.pos.x += -Math.sin(flight.heading) * flight.speed * dt;
    flight.pos.z += -Math.cos(flight.heading) * flight.speed * dt;
    flight.pos.y = clamp(flight.pos.y + Math.sin(flight.pitch) * flight.speed * dt, 12, 220);
    flight.vsi = (flight.pos.y - prevY) / Math.max(dt, 0.001) * 60;
    state.timer += dt;
    state.fuel = Math.max(0, state.fuel - dt * 0.12);
    if (checkRingPass(state, flight.pos)) updateRingVisuals(state, rings.meshes);
    if (flight.pos.y <= 12.5 || state.fuel <= 0) {
      state.crashed = true;
      screen = 'crashed';
      showScreen(hud, 'crashed', crashText(state.mission, state.ringsHit, state.timer, state.score));
    } else if (state.done) {
      screen = 'complete';
      showScreen(hud, 'complete', completeText(state.mission, state.ringsHit, state.timer, state.score));
    }
  }

  planeObj.group.position.copy(flight.pos);
  planeObj.group.rotation.set(flight.pitch, flight.heading, flight.roll, 'YXZ');
  updatePlane(planeObj, dt, elapsed, flight.throttle);
  updateWorld(world, dt, elapsed);
  updateCamera(dt);

  const r = currentRing(state);
  const dist = Math.sqrt((r.x - flight.pos.x) ** 2 + (r.y - flight.pos.y) ** 2 + (r.z - flight.pos.z) ** 2);
  updateHUD(hud, {
    mission: state.mission, score: state.score, ringsHit: state.ringsHit, timer: state.timer,
    spd: flight.speed * 1.9, vsi: flight.vsi, alt: flight.pos.y * 33, heading: ((360 - flight.heading * 180 / Math.PI) % 360 + 360) % 360,
    ringIndex: state.index, ringDist: nm(dist), command: commandFor(r), throttle: flight.throttle,
    fuel: state.fuel, hull: state.hull, dialog: missionDialog(state), roll: flight.roll,
    pitch: flight.pitch, pitchDeg: flight.pitch * 57.3, planePos: flight.pos, rings: state.rings,
    lighthouse: world.lighthousePos, cockpit: cameraMode === 'cockpit',
  });
  renderer.render(scene, camera);
  if (!window.__shotReady) window.__shotReady = true;
}
requestAnimationFrame(frame);
window.__shotReady = true;
