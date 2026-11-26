// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play, paused,
// landed and game over.
//
// ?seed=N fixes the world. ?shot=takeoff|ring|city|landing (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { throttleFromPointer, THROTTLE_RECT } from './hud.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Paint synchronously, twice: headless browsers do not reliably fire
  // requestAnimationFrame for a page that never animates, and this game draws
  // everything in one synchronous pass anyway. The readiness flag goes on the
  // document as an attribute as well as on window: some automation bridges
  // cannot see window properties a module set, but the DOM is always shared.
  renderer.draw(world.state, scene.screen, scene.best);
  renderer.draw(world.state, scene.screen, scene.best);
  window.__shotReady = true;
  document.documentElement.setAttribute('data-shot-ready', 'true');
}

function runGame() {
  const input = createInput(canvas);
  const audioApi = audio;
  let screen = 'title';
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let draggingLever = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.state.phase = 'play';
    accumulator = 0;
    screen = 'play';
    audioApi.unlock();
    audioApi.click();
    announce('Flying. Eight rings, then land back home.');
  }

  function endGame() {
    screen = 'over';
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Crashed. Score ${world.state.score}. Best ${best}.`);
  }

  function landGame() {
    screen = 'landed';
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Landed. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_RESTART && (screen === 'over' || screen === 'landed')) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over')) startGame();
    else if (actions & ACTION_CONFIRM && screen === 'landed') world.nextSortie();
    else if (actions & ACTION_PAUSE && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      announce('Flying.');
    }
  }

  function step() {
    const events = world.step(STEP, input.control(), audioApi);
    if (events & EVENT_OVER) endGame();
    else if (world.state.phase === 'landed') landGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    // The throttle lever is dragged with the pointer, in logical canvas pixels.
    const pointer = input.pointer();
    if (pointer.mouseDown && screen === 'play') {
      const mx = pointer.mouseX * 1280;
      const my = pointer.mouseY * 720;
      if (!draggingLever) {
        const value = throttleFromPointer(mx, my);
        if (value !== null) {
          draggingLever = true;
          world.state.plane.throttle = value;
        }
      } else {
        const r = THROTTLE_RECT;
        world.state.plane.throttle = Math.max(0, Math.min(1, 1 - (my - r.y) / r.height));
      }
    } else {
      draggingLever = false;
    }
    if (screen === 'play') {
      while (accumulator >= STEP && screen === 'play') {
        step();
        accumulator -= STEP;
      }
      audioApi.engine(world.state.plane.throttle, !world.state.plane.onGround, STEP);
    } else {
      accumulator = 0;
      audioApi.engine(0, false, STEP);
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    }
  });

  // A read-only handle for automated playtests; the game never writes through it.
  window.__skyCourier = { state: world.state, world };
  announce('Sky Courier. Press Enter or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
