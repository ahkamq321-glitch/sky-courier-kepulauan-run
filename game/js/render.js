// The chase view: sky, sun, clouds, a voxel-space terrain renderer that reads the
// baked height grid column by column, the target rings ahead, and the courier plane
// itself, drawn as a vector sprite with a spinning propeller and lit nav lights.
import { FIELD, PALETTE } from './config.js';
import { gridHeightAt, gridColourSmooth } from './terrain.js';
import { drawHud, drawScreen } from './hud.js';

const FOCAL = 600;
const COLUMN = 5;
const HALF_FOV = 0.55;
const FAR = 2400;
const SUN_AZIMUTH = 2.4;

/** Blend an [r, g, b] ground colour toward the hazy horizon colour by distance. */
function hazedColour(rgb, distance) {
  const f = Math.min(0.72, (distance / FAR) * 0.85);
  if (f <= 0.01) return `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
  const hr = 207;
  const hg = 230;
  const hb = 242;
  return `rgb(${Math.round(rgb[0] + (hr - rgb[0]) * f)},${Math.round(rgb[1] + (hg - rgb[1]) * f)},${Math.round(rgb[2] + (hb - rgb[2]) * f)})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function drawSky(state) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.42, PALETTE.skyMid);
    grad.addColorStop(0.55, PALETTE.skyHorizon);
    grad.addColorStop(1, '#9db8c4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // The sun sits at one fixed world bearing, so turning the plane moves it.
    const rel = SUN_AZIMUTH - state.plane.heading;
    if (Math.abs(rel) < 1.1) {
      const sx = FIELD.width / 2 + Math.tan(rel) * FOCAL;
      const sy = state.horizonY - 150;
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 120);
      glow.addColorStop(0, 'rgba(255,243,196,0.9)');
      glow.addColorStop(0.25, 'rgba(255,243,196,0.35)');
      glow.addColorStop(1, 'rgba(255,243,196,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 120, sy - 120, 240, 240);
      ctx.fillStyle = PALETTE.sun;
      ctx.beginPath();
      ctx.arc(sx, sy, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Voxel-space terrain: each screen column walks a ray forward, painting the
   *  ground where it rises above everything drawn below it in that column. */
  function drawTerrain(state) {
    const plane = state.plane;
    const camX = plane.x - Math.sin(plane.heading) * 16;
    const camZ = plane.z - Math.cos(plane.heading) * 16;
    const camAlt = plane.alt + 4.2;
    const horizonY = state.horizonY;
    const grid = state.grid;
    const heading = plane.heading;
    for (let cx = 0; cx < FIELD.width; cx += COLUMN) {
      const ray = heading + ((cx - FIELD.width / 2) / FIELD.width) * 2 * HALF_FOV;
      const dx = Math.sin(ray);
      const dz = Math.cos(ray);
      let maxY = FIELD.height;
      let d = 24;
      while (d < FAR) {
        const wx = camX + dx * d;
        const wz = camZ + dz * d;
        const h = gridHeightAt(grid, wx, wz);
        const y = horizonY + ((camAlt - h) * FOCAL) / d;
        if (y < maxY) {
          ctx.fillStyle = hazedColour(gridColourSmooth(grid, wx, wz), d);
          ctx.fillRect(cx, y, COLUMN, maxY - y);
          maxY = y;
          if (maxY <= horizonY + 1) break;
        }
        d *= 1.05;
      }
    }
  }

  function drawClouds(state) {
    const plane = state.plane;
    const camX = plane.x - Math.sin(plane.heading) * 16;
    const camZ = plane.z - Math.cos(plane.heading) * 16;
    const camAlt = plane.alt + 4.2;
    const heading = plane.heading;
    const sorted = [...state.clouds].sort((a, b) => {
      const da = (a.x - camX) * Math.sin(heading) + (a.z - camZ) * Math.cos(heading);
      const db = (b.x - camX) * Math.sin(heading) + (b.z - camZ) * Math.cos(heading);
      return db - da;
    });
    for (const cloud of sorted) {
      const dx = cloud.x - camX;
      const dz = cloud.z - camZ;
      const forward = dx * Math.sin(heading) + dz * Math.cos(heading);
      if (forward < 40 || forward > 4200) continue;
      const lateral = dx * Math.cos(heading) - dz * Math.sin(heading);
      const sx = FIELD.width / 2 + (lateral * FOCAL) / forward;
      const sy = state.horizonY - ((cloud.alt - camAlt) * FOCAL) / forward;
      const s = (cloud.radius * FOCAL) / forward;
      if (sx < -s * 2 || sx > FIELD.width + s * 2 || sy < -s || sy > FIELD.height + s) continue;
      ctx.fillStyle = cloud.storm ? 'rgba(74,82,94,0.88)' : 'rgba(255,255,255,0.88)';
      for (const [ox, oy, r] of [
        [0, 0, 1],
        [-0.7, 0.15, 0.62],
        [0.7, 0.12, 0.66],
        [0.15, -0.28, 0.6],
      ]) {
        ctx.beginPath();
        ctx.ellipse(sx + ox * s, sy + oy * s, r * s, r * s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (cloud.storm && (state.time * 0.7 + cloud.x) % 7 < 0.18) {
        ctx.strokeStyle = 'rgba(255,255,220,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy + s * 0.4);
        ctx.lineTo(sx - 6, sy + s * 0.9);
        ctx.lineTo(sx + 4, sy + s * 1.3);
        ctx.lineTo(sx - 2, sy + s * 1.8);
        ctx.stroke();
      }
    }
  }

  function drawRings(state) {
    const plane = state.plane;
    const camX = plane.x - Math.sin(plane.heading) * 16;
    const camZ = plane.z - Math.cos(plane.heading) * 16;
    const camAlt = plane.alt + 4.2;
    const heading = plane.heading;
    const next = state.rings.find((r) => !r.passed) ?? null;
    const sorted = [...state.rings].sort((a, b) => {
      const da = (a.x - camX) * Math.sin(heading) + (a.z - camZ) * Math.cos(heading);
      const db = (b.x - camX) * Math.sin(heading) + (b.z - camZ) * Math.cos(heading);
      return db - da;
    });
    for (const ring of sorted) {
      const dx = ring.x - camX;
      const dz = ring.z - camZ;
      const forward = dx * Math.sin(heading) + dz * Math.cos(heading);
      if (forward < 18 || forward > 3200) continue;
      const lateral = dx * Math.cos(heading) - dz * Math.sin(heading);
      const sx = FIELD.width / 2 + (lateral * FOCAL) / forward;
      const sy = state.horizonY - ((ring.alt - camAlt) * FOCAL) / forward;
      const r = (ring.radius * FOCAL) / forward;
      if (r < 2 || sx < -r * 2 || sx > FIELD.width + r * 2) continue;
      const isNext = ring === next;
      const colour = ring.passed ? PALETTE.ringDone : isNext ? PALETTE.ringNext : PALETTE.ringLater;
      const alpha = ring.passed ? 0.35 : isNext ? 0.72 + 0.25 * Math.sin(state.time * 6) : 0.5;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colour;
      ctx.lineWidth = Math.max(3, r * 0.13);
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = colour;
      ctx.globalAlpha = alpha * 0.12;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // A dashed beacon down to the ground helps judge where the ring really is.
      const groundY = state.horizonY - ((0 - camAlt) * FOCAL) / forward;
      ctx.strokeStyle = colour;
      ctx.globalAlpha = alpha * 0.5;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(sx, sy + r * 0.92);
      ctx.lineTo(sx, Math.min(groundY, FIELD.height));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (isNext) {
        ctx.fillStyle = PALETTE.text;
        ctx.font = '600 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const dist = Math.round(Math.hypot(dx, dz));
        ctx.fillText(`${ring.label} · ${dist} m`, sx, sy - r - 12);
      }
    }
  }

  /** An amber arrow at the screen edge pointing at the next ring, for when the
   *  pilot has flown past it or it is out of frame: the ring is always findable. */
  function drawRingGuide(state) {
    const next = state.rings.find((r) => !r.passed) ?? null;
    if (!next) return;
    const plane = state.plane;
    const dx = next.x - plane.x;
    const dz = next.z - plane.z;
    const dist = Math.hypot(dx, dz);
    const forward = dx * Math.sin(plane.heading) + dz * Math.cos(plane.heading);
    const lateral = dx * Math.cos(plane.heading) - dz * Math.sin(plane.heading);
    const sx = FIELD.width / 2 + (lateral * FOCAL) / Math.max(1, forward);
    const sy = state.horizonY - ((next.alt - (plane.alt + 4.2)) * FOCAL) / Math.max(1, forward);
    if (forward > 18 && sx > 60 && sx < FIELD.width - 60 && sy > 60 && sy < 540) return;
    const rel = Math.atan2(dx, dz) - plane.heading;
    const cx = Math.max(50, Math.min(FIELD.width - 50, FIELD.width / 2 + Math.sin(rel) * 520));
    // Keep the arrow in the upper half, clear of the plane sprite below.
    const cy = Math.max(90, Math.min(400, 300 - Math.cos(rel) * 210));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rel);
    ctx.fillStyle = PALETTE.ringNext;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 10);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.ringNext;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${next.label} · ${Math.round(dist)} m`, cx, cy - 24);
  }

  /** The courier plane, seen from behind and slightly above: tail near the camera,
   *  nose and propeller far away, wings spread, nav lights lit. */
  function drawPlane(state) {
    const plane = state.plane;
    const px = FIELD.width / 2;
    const py = 468 - plane.pitch * 90;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(plane.bank * 0.85);
    const blink = state.time % 1 < 0.12;
    // Wings, with red tips and a blue cheatline.
    for (const side of [-1, 1]) {
      ctx.fillStyle = PALETTE.planeWhite;
      ctx.beginPath();
      ctx.moveTo(side * 14, -8);
      ctx.lineTo(side * 168, -36);
      ctx.lineTo(side * 176, -20);
      ctx.lineTo(side * 16, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.planeBlue;
      ctx.fillRect(side > 0 ? 16 : -168, -14, 152, 4);
      ctx.fillStyle = PALETTE.planeRed;
      ctx.beginPath();
      ctx.moveTo(side * 150, -33);
      ctx.lineTo(side * 176, -20);
      ctx.lineTo(side * 176, -13);
      ctx.lineTo(side * 150, -26);
      ctx.closePath();
      ctx.fill();
      // Nav light on each wingtip.
      ctx.fillStyle = side < 0 ? '#ff3b30' : '#34e07a';
      ctx.beginPath();
      ctx.arc(side * 172, -22, blink ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tailplane and fin.
    ctx.fillStyle = PALETTE.planeWhite;
    ctx.beginPath();
    ctx.moveTo(-58, 58);
    ctx.lineTo(58, 58);
    ctx.lineTo(44, 74);
    ctx.lineTo(-44, 74);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.planeRed;
    ctx.beginPath();
    ctx.moveTo(-13, 76);
    ctx.lineTo(0, 26);
    ctx.lineTo(13, 76);
    ctx.closePath();
    ctx.fill();
    // Fuselage, tapering from the tail toward the nose.
    ctx.fillStyle = PALETTE.planeWhite;
    ctx.beginPath();
    ctx.moveTo(-24, 72);
    ctx.bezierCurveTo(-26, 20, -18, -60, -9, -96);
    ctx.lineTo(9, -96);
    ctx.bezierCurveTo(18, -60, 26, 20, 24, 72);
    ctx.quadraticCurveTo(0, 82, -24, 72);
    ctx.fill();
    ctx.fillStyle = PALETTE.planeRed;
    ctx.fillRect(-22, 18, 44, 5);
    ctx.fillStyle = PALETTE.planeBlue;
    ctx.fillRect(-20, 26, 40, 3);
    // Cockpit windows, seen from above.
    ctx.fillStyle = '#1d2a3a';
    ctx.beginPath();
    ctx.roundRect(-13, -58, 11, 18, 4);
    ctx.roundRect(2, -58, 11, 18, 4);
    ctx.fill();
    // Propeller disc and blades at the nose, spinning.
    ctx.fillStyle = 'rgba(30,30,30,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, -100, 34, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,25,25,0.55)';
    ctx.lineWidth = 5;
    for (const a of [plane.propAngle, plane.propAngle + Math.PI / 2]) {
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * 32, -100 - Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 32, -100 + Math.sin(a) * 8);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.planeRed;
    ctx.beginPath();
    ctx.arc(0, -100, 6, 0, Math.PI * 2);
    ctx.fill();
    // Registration and the white tail strobe.
    ctx.fillStyle = PALETTE.planeBlue;
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PK-SKY', 0, 52);
    if (blink) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 78, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEffects(state) {
    const plane = state.plane;
    // Speed streaks at the screen edges when the courier is really moving.
    if (plane.speed > 52 && !plane.onGround) {
      const strength = Math.min(0.3, (plane.speed - 52) / 110);
      ctx.strokeStyle = `rgba(255,255,255,${strength})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i += 1) {
        const seed = (i * 137.5 + state.time * 900) % 720;
        const x = (i % 2 === 0 ? 20 + ((i * 97) % 180) : FIELD.width - 20 - ((i * 89) % 180));
        const y = seed;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (i % 2 === 0 ? -14 : 14), y + 46);
        ctx.stroke();
      }
    }
    // Smoke from the left wing when the airframe is hurt.
    if (plane.damage > 35 && !plane.onGround) {
      ctx.fillStyle = 'rgba(90,90,90,0.4)';
      for (let i = 0; i < 3; i += 1) {
        const t = (state.time * 0.9 + i * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(FIELD.width / 2 - 170 + t * 40, 440 - t * 30, 6 + t * 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // A red wash right after damage, and a low-fuel blink.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,40,30,${state.flash * 0.28})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (plane.fuel < 20 && !plane.onGround && Math.floor(state.time * 2) % 2 === 0) {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOW FUEL — LAND OR FINISH THE ROUTE', FIELD.width / 2, 120);
    }
    if (plane.groundWarn && plane.alt < 45 && !plane.onGround) {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TERRAIN — PULL UP', FIELD.width / 2, 150);
    }
  }

  return {
    draw(state, screen, best) {
      state.horizonY = FIELD.height * 0.44 + state.plane.pitch * 620;
      drawSky(state);
      ctx.save();
      ctx.translate(FIELD.width / 2, state.horizonY);
      ctx.rotate(-state.plane.bank * 0.45);
      ctx.translate(-FIELD.width / 2, -state.horizonY);
      drawTerrain(state);
      drawClouds(state);
      drawRings(state);
      ctx.restore();
      if (screen !== 'title') drawRingGuide(state);
      drawPlane(state);
      drawEffects(state);
      drawHud(ctx, state, best);
      drawScreen(ctx, state, screen, best);
    },
  };
}
