// The courier aeroplane: one state object and the arcade flight model that moves it.
// Throttle makes speed, speed makes lift, bank turns the nose, pitch trades speed for
// height. Below stall speed the wing quits and the nose drops.
import { PLANE } from './config.js';
import { terrainHeightAt, inRunway } from './terrain.js';

export function createPlane() {
  return {
    x: 0,
    z: 80,
    alt: 2,
    heading: 0,
    pitch: 0,
    bank: 0,
    speed: 0,
    throttle: 0,
    fuel: 100,
    damage: 0,
    onGround: true,
    vspeed: 0,
    /** Seconds since the last terrain scare, for the ground-proximity warning. */
    groundWarn: 0,
    /** Roll of the propeller, for the sprite. */
    propAngle: 0,
  };
}

/**
 * Move the plane one fixed step. `ctl` is { bank: -1..1, pitch: -1..1, throttle: -1..1 }
 * from the keyboard, mouse or autopilot, and `wind` is { x, z } in m/s.
 * Returns a string event or '' : 'takeoff' | 'touchdown' | 'hard' | 'crash' | 'stall'.
 */
export function stepPlane(plane, dt, ctl, wind) {
  plane.throttle = Math.max(0, Math.min(1, plane.throttle + ctl.throttle * dt * 0.7));
  const targetBank = ctl.bank * PLANE.maxBank;
  const bankRate = PLANE.bankRate * dt;
  plane.bank += Math.max(-bankRate, Math.min(bankRate, targetBank - plane.bank));
  const targetPitch = ctl.pitch * PLANE.maxPitch;
  const pitchRate = PLANE.pitchRate * dt;
  plane.pitch += Math.max(-pitchRate, Math.min(pitchRate, targetPitch - plane.pitch));

  // Coordinated turn: the real rate is g*tan(bank)/speed, lifted a little for arcade feel.
  // On the ground the nosewheel barely steers, so the turn is much weaker there.
  const turnRate =
    (9.81 * Math.tan(plane.bank)) / Math.max(plane.speed, 15) * PLANE.turnGain * (plane.onGround ? 0.25 : 1);
  plane.heading += turnRate * dt;

  // Speed: thrust minus drag, minus the climb's share of gravity.
  const accel =
    plane.throttle * PLANE.thrust -
    PLANE.drag * plane.speed * plane.speed -
    Math.sin(plane.pitch) * 9.81 * 0.55 -
    (plane.onGround ? 2.5 : 0);
  plane.speed = Math.max(0, Math.min(PLANE.maxSpeed, plane.speed + accel * dt));

  // Lift: above stall the pitch sets the climb; below it the nose drops and we sink.
  const stalled = plane.speed < PLANE.stallSpeed;
  if (plane.onGround) {
    plane.vspeed = 0;
    // Roll with the terrain; rolling into the sea ends the sortie.
    const groundNow = terrainHeightAt(plane.x, plane.z);
    plane.alt = groundNow + 0.6;
    if (groundNow < -0.5) return 'crash';
    if (plane.speed > PLANE.stallSpeed + 4 && plane.pitch > 0.08) {
      plane.onGround = false;
      plane.alt = terrainHeightAt(plane.x, plane.z) + 1;
      plane.vspeed = Math.sin(plane.pitch) * plane.speed;
      return 'takeoff';
    }
  } else if (stalled) {
    plane.vspeed += (-9 - plane.vspeed) * dt * 1.5;
  } else {
    const wanted = Math.sin(plane.pitch) * plane.speed * 0.92;
    plane.vspeed += (wanted - plane.vspeed) * dt * 1.6;
  }
  plane.alt += plane.vspeed * dt;

  plane.x += (Math.sin(plane.heading) * plane.speed + wind.x) * dt;
  plane.z += (Math.cos(plane.heading) * plane.speed + wind.z) * dt;
  plane.propAngle += (2 + plane.throttle * 38) * dt;

  // Fuel: idle burn plus throttle burn; the sortie is timed to need the ring bonuses.
  plane.fuel = Math.max(0, plane.fuel - (PLANE.fuelIdle + plane.throttle * PLANE.fuelFull) * dt);

  const ground = terrainHeightAt(plane.x, plane.z);
  const clearance = plane.alt - ground;
  plane.groundWarn = clearance < 25 && !plane.onGround ? 1 : 0;

  if (!plane.onGround && plane.alt <= ground + 0.6) {
    plane.alt = ground + 0.6;
    const onStrip = inRunway(plane.x, plane.z);
    const aligned = Math.abs(Math.sin(plane.heading)) < 0.35;
    if (onStrip && aligned && plane.vspeed > PLANE.softTouchdown && plane.speed < 55) {
      plane.onGround = true;
      plane.vspeed = 0;
      plane.pitch = 0;
      return 'touchdown';
    }
    if (plane.vspeed < -12 || plane.speed > 60) return 'crash';
    plane.damage = Math.min(100, plane.damage + 30);
    plane.onGround = true;
    plane.vspeed = 0;
    plane.speed *= 0.4;
    return 'hard';
  }
  if (plane.fuel <= 0 && !plane.onGround) {
    plane.throttle = 0;
    if (plane.speed < PLANE.stallSpeed && plane.alt <= ground + 2) return 'crash';
  }
  return stalled && !plane.onGround ? 'stall' : '';
}
