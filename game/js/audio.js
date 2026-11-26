// Sound, all synthesised in the browser: an engine hum that follows the throttle,
// a chime for each ring, a low-fuel alarm and a crash thud. No audio files.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let started = false;

  function ensure() {
    if (started) return;
    started = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
    } catch {
      context = null;
    }
  }

  function tone(freq, seconds, type, volume, when = 0) {
    if (!context) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = context.currentTime + when;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(t);
      osc.stop(t + seconds + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Call on the first gesture so the browser allows sound. */
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume().catch(() => {});
    },
    /** Engine hum follows throttle (0..1) and whether the plane is airborne. */
    engine(throttle, airborne, dt) {
      if (!context || !engineOsc) return;
      const target = airborne ? 0.05 + throttle * 0.075 : throttle * 0.05;
      engineOsc.frequency.setTargetAtTime(48 + throttle * 62, context.currentTime, dt);
      engineGain.gain.setTargetAtTime(target, context.currentTime, dt);
    },
    ring() {
      tone(660, 0.22, 'sine', 0.16);
      tone(990, 0.3, 'sine', 0.14, 0.09);
    },
    alarm() {
      tone(880, 0.12, 'square', 0.05);
    },
    thud() {
      tone(70, 0.5, 'sine', 0.3);
      tone(45, 0.7, 'triangle', 0.22, 0.05);
    },
    click() {
      tone(520, 0.06, 'sine', 0.08);
    },
  };
}
