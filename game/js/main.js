// Karst Bay Courier — boot, game loop, cameras, input, screens, screenshot scenes.
// Real 3D via Three.js (vendored UMD, global THREE). The HUD is a 2D canvas overlay.
import { FIELD, LAYOUT, MISSIONS } from './config.js';
import { buildPlane, createPlaneState, resetPlane, updatePlane, applyPlaneTransform } from './plane.js';
import { buildWorld } from './world.js';
import { buildMissions } from './missions.js';
import { createHud } from './hud.js';
import { SCREEN_COMPLETE, SCREEN_MENU, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './screens.js';

const params = new URLSearchParams(location.search);
const sceneName = params.get('scene');

// --- canvases ---
const glCanvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
hudCanvas.width = FIELD.width;
hudCanvas.height = FIELD.height;
const hudCtx = hudCanvas.getContext('2d');

// --- renderer / scene / camera ---
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(FIELD.width, FIELD.height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, FIELD.width / FIELD.height, 0.1, 7000);

const world = buildWorld(scene);
const planeObj = buildPlane();
scene.add(planeObj.group);
const missions = buildMissions(scene);
const hud = createHud(hudCtx);

// --- 3D cockpit frame: dashboard + pillars + cowling, shown in cockpit view only ---
// It is a separate scene object (not a child of the plane) so the plane model can
// be hidden in cockpit view without hiding the frame.
const cockpitFrame = new THREE.Group();
const frameMat = new THREE.MeshStandardMaterial({ color: 0x14101f, roughness: 0.8 });
const dash = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 0.5), frameMat);
dash.position.set(0, -0.55, -2.6);
const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.18), frameMat);
pillarL.position.set(-1.5, 0.6, -2.6);
pillarL.rotation.z = 0.25;
const pillarR = pillarL.clone();
pillarR.position.x = 1.5;
pillarR.rotation.z = -0.25;
const cowling = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10),
  new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.55 }));
cowling.scale.set(1, 0.55, 1.6);
cowling.position.set(0, -0.75, -3.6);
cockpitFrame.add(dash, pillarL, pillarR, cowling);
cockpitFrame.visible = false;
scene.add(cockpitFrame);

// --- input ---
const input = {
  pitchUp: false, pitchDown: false, rollLeft: false, rollRight: false,
  yawLeft: false, yawRight: false, throttleUp: false, throttleDown: false,
};
const keys = {};
function readInput() {
  input.pitchUp = !!keys['KeyW'] || !!keys['ArrowUp'];
  input.pitchDown = !!keys['KeyS'] || !!keys['ArrowDown'];
  input.rollLeft = !!keys['KeyA'] || !!keys['ArrowLeft'];
  input.rollRight = !!keys['KeyD'] || !!keys['ArrowRight'];
  input.yawLeft = !!keys['KeyQ'];
  input.yawRight = !!keys['KeyE'];
  input.throttleUp = !!keys['ShiftLeft'] || !!keys['ShiftRight'];
  input.throttleDown = !!keys['ControlLeft'] || !!keys['ControlRight'];
}
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyC' && state.screen === SCREEN_PLAY) {
    state.camera = state.camera === 'chase' ? 'cockpit' : 'chase';
    snapCamera();
  }
  if (e.code === 'KeyR') startMission(selectedMission);
  if (e.code === 'KeyP') {
    if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
    else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
  }
  if (e.code === 'Space') {
    if (state.screen === SCREEN_PLAY && state.mission.id === 'drop') {
      if (missions.dropCrate(state.plane)) {
        state.crateDropped = true;
        state.message = 'Crate away!';
        state.messageTimer = 2;
      }
    }
    e.preventDefault();
  }
  if (e.code === 'Enter') {
    if (state.screen === SCREEN_TITLE) state.screen = SCREEN_MENU;
    else if (state.screen === SCREEN_MENU) startMission(selectedMission);
    else if (state.screen === SCREEN_COMPLETE || state.screen === SCREEN_OVER) state.screen = SCREEN_MENU;
  }
  if (state.screen === SCREEN_MENU) {
    if (e.code === 'ArrowUp') selectedMission = (selectedMission + MISSIONS.length - 1) % MISSIONS.length;
    if (e.code === 'ArrowDown') selectedMission = (selectedMission + 1) % MISSIONS.length;
  }
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- game state ---
const state = {
  plane: createPlaneState(),
  camera: 'chase',
  mission: MISSIONS[0],
  screen: SCREEN_TITLE,
  score: 0, ringsCleared: 0, stripsLanded: 0,
  crateDropped: false, dropDoneAt: 0,
  elapsed: 0, message: '', messageTimer: 0, rank: '',
  frozen: false,
};
let selectedMission = 0;
let best = 0;
try { best = Number(localStorage.getItem('kbc-best') || 0); } catch (e) { best = 0; }

function startMission(i) {
  selectedMission = i;
  state.mission = MISSIONS[i];
  resetPlane(state.plane);
  missions.reset();
  state.score = 0; state.ringsCleared = 0; state.stripsLanded = 0;
  state.crateDropped = false; state.dropDoneAt = 0;
  state.elapsed = 0; state.message = ''; state.messageTimer = 0;
  state.screen = SCREEN_PLAY;
  snapCamera();
}

function completeMission() {
  state.rank = state.score >= 1200 ? 'GOLD CLASS' : state.score >= 700 ? 'SILVER CLASS' : 'BRONZE CLASS';
  state.screen = SCREEN_COMPLETE;
  if (state.score > best) {
    best = state.score;
    try { localStorage.setItem('kbc-best', String(best)); } catch (e) { /* storage unavailable */ }
  }
}

function crash(msg) {
  state.message = msg;
  state.plane.damage = 100;
  state.screen = SCREEN_OVER;
}

function overStrip(x, z) {
  for (const s of [LAYOUT.strip, ...LAYOUT.hopStrips]) {
    const dx = x - s.x, dz = z - s.z;
    const ch = Math.cos(s.heading), sh = Math.sin(s.heading);
    const lx = dx * ch - dz * sh, lz = dx * sh + dz * ch;
    const halfW = s === LAYOUT.strip ? 35 : 25;
    if (Math.abs(lx) < s.length / 2 + 20 && Math.abs(lz) < halfW) return true;
  }
  return false;
}

function checkCrash() {
  const p = state.plane;
  if (p.grounded && !overStrip(p.x, p.z) && p.speed > 8) {
    crash('DITCHED IN THE SEA');
    return;
  }
  for (const k of LAYOUT.karst) {
    const dx = p.x - k.x, dz = p.z - k.z;
    if (dx * dx + dz * dz < (k.r + 3) * (k.r + 3) && p.y < k.h) {
      crash('HIT A KARST TOWER');
      return;
    }
  }
  if (p.fuel <= 0 && p.grounded && !overStrip(p.x, p.z)) crash('OUT OF FUEL — DITCHED');
}

function checkComplete() {
  if (state.mission.id === 'rings' && state.ringsCleared >= 8) completeMission();
  else if (state.mission.id === 'hop' && state.stripsLanded >= 3) completeMission();
  else if (state.mission.id === 'land' && state.stripsLanded >= 1) completeMission();
  else if (state.mission.id === 'drop' && state.crateDropped && !missions.crateState.active) {
    if (!state.dropDoneAt) state.dropDoneAt = time;
    if (time - state.dropDoneAt > 1.2) completeMission();
  }
}

// --- cameras ---
function snapCamera() {
  const p = state.plane;
  const sh = Math.sin(p.heading), ch = Math.cos(p.heading);
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const fx = sh * cp, fy = sp, fz = -ch * cp;
  if (state.camera === 'cockpit') {
    camera.position.set(p.x + fx * 0.6, p.y + 1.35 + fy * 0.6, p.z + fz * 0.6);
  } else {
    camera.position.set(p.x - fx * 20 + ch * 7, p.y - fy * 20 + 6.5, p.z - fz * 20 + sh * 7);
  }
  camera.lookAt(p.x + fx * 40, p.y + fy * 40, p.z + fz * 40);
}

function updateCamera(dt) {
  const p = state.plane;
  const sh = Math.sin(p.heading), ch = Math.cos(p.heading);
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const fx = sh * cp, fy = sp, fz = -ch * cp;
  if (state.camera === 'cockpit') {
    camera.position.set(p.x + fx * 0.6, p.y + 1.35 + fy * 0.6, p.z + fz * 0.6);
    camera.lookAt(p.x + fx * 120, p.y + fy * 120 - 4, p.z + fz * 120);
    camera.rotateZ(p.roll);
  } else {
    const bx = p.x - fx * 20 + ch * 7, by = p.y - fy * 20 + 6.5, bz = p.z - fz * 20 + sh * 7;
    const k = Math.min(1, dt * 4);
    camera.position.x += (bx - camera.position.x) * k;
    camera.position.y += (by - camera.position.y) * k;
    camera.position.z += (bz - camera.position.z) * k;
    camera.lookAt(p.x + fx * 40, p.y + fy * 40, p.z + fz * 40);
  }
}

// --- deterministic screenshot scenes (frozen: the plane holds its staged pose) ---
function applyScene(name) {
  state.frozen = true;
  const p = state.plane;
  if (name === 'cover') {
    // Chase view: ring 1 dead ahead, lighthouse to its RIGHT — both fully visible.
    state.screen = SCREEN_PLAY;
    state.mission = MISSIONS[0];
    state.camera = 'chase';
    p.x = 0; p.y = 110; p.z = 500; p.heading = 0; p.pitch = 0; p.roll = 0;
    p.speed = 42; p.throttle = 0.62; p.fuel = 82; p.damage = 0;
  } else if (name === 'cockpit') {
    // Cockpit view on final approach to the coastal strip, runway ahead over the cowling.
    state.screen = SCREEN_PLAY;
    state.mission = MISSIONS[3];
    state.camera = 'cockpit';
    p.x = -300; p.y = 55; p.z = 120; p.heading = 0; p.pitch = -0.06; p.roll = 0;
    p.speed = 40; p.throttle = 0.5; p.fuel = 68; p.damage = 0;
  } else if (name === 'drop') {
    // Chase view: the parachute + crate hang WEST of the lighthouse, so the tower
    // stays fully visible beside them instead of behind them.
    state.screen = SCREEN_PLAY;
    state.mission = MISSIONS[1];
    state.camera = 'chase';
    p.x = 60; p.y = 150; p.z = -60; p.heading = 0; p.pitch = 0; p.roll = 0;
    p.speed = 40; p.throttle = 0.55; p.fuel = 64; p.damage = 0;
    missions.dropCrate({ x: 0, y: 120, z: -250 });
    state.crateDropped = true;
    state.message = 'Crate away!';
    state.messageTimer = 99;
  } else if (name === 'title') {
    state.screen = SCREEN_TITLE;
    state.camera = 'chase';
    p.x = 0; p.y = 110; p.z = 500; p.heading = 0; p.pitch = 0; p.roll = 0;
    p.speed = 42; p.throttle = 0.62; p.fuel = 82; p.damage = 0;
  }
  applyPlaneTransform(planeObj, p, 0);
  snapCamera();
}

// --- main loop ---
let last = performance.now();
let time = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  readInput();
  if (state.screen === SCREEN_PLAY && !state.frozen) {
    updatePlane(state.plane, input, dt);
    missions.update(state, dt);
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    checkCrash();
    checkComplete();
  }
  world.update(dt, time, state.plane);
  applyPlaneTransform(planeObj, state.plane, time);
  if (state.camera === 'cockpit') {
    planeObj.group.visible = false;
    cockpitFrame.visible = true;
    cockpitFrame.position.copy(planeObj.group.position);
    cockpitFrame.rotation.copy(planeObj.group.rotation);
  } else {
    planeObj.group.visible = true;
    cockpitFrame.visible = false;
  }
  updateCamera(dt);
  renderer.render(scene, camera);
  hudCtx.clearRect(0, 0, FIELD.width, FIELD.height);
  hud.draw(state, state.screen, missions, best, time, selectedMission);
}

if (sceneName) applyScene(sceneName);
else snapCamera();
requestAnimationFrame(frame);
