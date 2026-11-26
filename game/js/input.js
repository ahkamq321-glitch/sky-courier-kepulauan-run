// Keyboard and mouse: arrows or WASD steer, W/S and the wheel work the throttle,
// the pointer steers when it moves, Enter/Space confirms, P pauses, R restarts.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    mouseX: 0,
    mouseY: 0,
    mouseIn: false,
    mouseDown: false,
    wheel: 0,
  };
  let actions = 0;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
  }
  function keyUp(event) {
    keys.delete(event.code);
  }
  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = (event.clientX - rect.left) / rect.width;
    state.mouseY = (event.clientY - rect.top) / rect.height;
    state.mouseIn = true;
  }
  function mouseDown(event) {
    state.mouseDown = true;
    actions |= ACTION_CONFIRM;
  }
  function mouseUp() {
    state.mouseDown = false;
  }
  function mouseWheel(event) {
    event.preventDefault();
    state.wheel += event.deltaY < 0 ? 1 : -1;
  }
  function blur() {
    keys.clear();
    state.mouseDown = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('wheel', mouseWheel, { passive: false });
  canvas.addEventListener('mouseleave', () => {
    state.mouseIn = false;
  });

  return {
    /** One-shot actions since the last read (confirm, pause, restart). */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Steering for this frame: bank -1..1, pitch -1..1, throttle -1..1. */
    control() {
      let bank = 0;
      let pitch = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) bank -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) bank += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) pitch += 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) pitch -= 1;
      // The pointer steers too: sideways is bank, up/down is climb/descend.
      if (state.mouseIn && !state.mouseDown) {
        bank += Math.max(-1, Math.min(1, (state.mouseX - 0.5) * 2.4));
        pitch += Math.max(-1, Math.min(1, (0.5 - state.mouseY) * 2.2));
      }
      let throttle = 0;
      if (keys.has('KeyE') || keys.has('ShiftLeft') || keys.has('ShiftRight')) throttle += 1;
      if (keys.has('KeyQ') || keys.has('ControlLeft')) throttle -= 1;
      throttle += state.wheel;
      state.wheel = 0;
      return {
        bank: Math.max(-1, Math.min(1, bank)),
        pitch: Math.max(-1, Math.min(1, pitch)),
        throttle: Math.max(-1, Math.min(1, throttle)),
      };
    },
    /** Raw pointer state, for the draggable throttle lever in the HUD. */
    pointer() {
      return state;
    },
  };
}
