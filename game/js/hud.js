// The HUD and the screens: altitude, speed and heading up top, a compass tape, lit
// instrument dials and a draggable throttle lever along the bottom, and the title,
// pause, crash and landing screens in between.
import { FIELD, PALETTE, FONT } from './config.js';
import { nextRing } from './rings.js';

export const THROTTLE_RECT = { x: 1176, y: 612, width: 30, height: 92 };

/** Throttle (0..1) for a pointer at logical (mx, my), or null outside the lever. */
export function throttleFromPointer(mx, my) {
  const r = THROTTLE_RECT;
  if (mx < r.x - 14 || mx > r.x + r.width + 14 || my < r.y - 10 || my > r.y + r.height + 10) return null;
  return Math.max(0, Math.min(1, 1 - (my - r.y) / r.height));
}

function dial(ctx, cx, cy, radius, value, min, max, label, unit, colour) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#0d1218';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lit tick marks around the rim.
  for (let i = 0; i <= 10; i += 1) {
    const a = (-Math.PI * 0.75) + (i / 10) * Math.PI * 1.5;
    const inner = radius - (i % 5 === 0 ? 10 : 6);
    ctx.strokeStyle = i % 5 === 0 ? PALETTE.warn : PALETTE.muted;
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * (radius - 2), Math.sin(a) * (radius - 2));
    ctx.stroke();
  }
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -Math.PI * 0.75 + t * Math.PI * 1.5;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (radius - 8), Math.sin(angle) * (radius - 8));
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(value)}`, 0, radius * 0.42);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 10px ${FONT}`;
  ctx.fillText(label, 0, -radius - 8);
  ctx.fillText(unit, 0, radius * 0.68);
  ctx.restore();
}

function bar(ctx, x, y, width, height, value, colour, label) {
  ctx.fillStyle = '#0d1218';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = colour;
  const filled = Math.max(0, Math.min(1, value));
  ctx.fillRect(x, y + height * (1 - filled), width, height * filled);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + width / 2, y - 6);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 12px ${FONT}`;
  ctx.fillText(`${Math.round(value * 100)}`, x + width / 2, y + height + 14);
}

function compass(ctx, heading, y) {
  const cx = FIELD.width / 2;
  const width = 380;
  ctx.fillStyle = 'rgba(13,18,24,0.72)';
  ctx.fillRect(cx - width / 2, y - 16, width, 32);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(cx - width / 2, y - 16, width, 32);
  const deg = ((heading * 180) / Math.PI % 360 + 360) % 360;
  const points = [
    [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
    [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
  ];
  ctx.font = `600 12px ${FONT}`;
  ctx.textAlign = 'center';
  for (const [d, name] of points) {
    let diff = ((d - deg + 540) % 360) - 180;
    const x = cx + (diff / 60) * (width / 2);
    if (x < cx - width / 2 + 8 || x > cx + width / 2 - 8) continue;
    ctx.fillStyle = name.length === 1 ? PALETTE.warn : PALETTE.text;
    ctx.fillText(name, x, y + 4);
  }
  ctx.fillStyle = PALETTE.warn;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y - 16);
  ctx.lineTo(cx + 6, y - 16);
  ctx.lineTo(cx, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText(`${String(Math.round(deg)).padStart(3, '0')}°`, cx, y + 28);
}

function artificialHorizon(ctx, cx, cy, radius, bank, pitch) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-bank);
  const offset = Math.max(-radius, Math.min(radius, pitch * radius * 2.2));
  ctx.fillStyle = '#7fb2dd';
  ctx.fillRect(-radius, -radius + offset - radius, radius * 2, radius * 2);
  ctx.fillStyle = '#8a6b46';
  ctx.fillRect(-radius, offset, radius * 2, radius * 2);
  ctx.strokeStyle = PALETTE.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius, offset);
  ctx.lineTo(radius, offset);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.warn;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', cx, cy - radius - 8);
}

export function drawHud(ctx, state, best) {
  const plane = state.plane;
  const ring = nextRing(state.rings);
  const top = 14;
  // A soft shadow keeps the white readouts legible over bright sky and clouds.
  ctx.shadowColor = 'rgba(10,14,20,0.65)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1;
  // Top-left readouts: altitude, speed, heading.
  ctx.textAlign = 'left';
  ctx.font = `700 20px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`ALT ${Math.round(Math.max(0, plane.alt))} m`, 16, top + 20);
  ctx.fillText(`SPD ${Math.round(plane.speed * 3.6)} km/h`, 16, top + 46);
  ctx.fillText(`HDG ${String(Math.round(((plane.heading * 180) / Math.PI % 360 + 360) % 360)).padStart(3, '0')}°`, 16, top + 72);
  compass(ctx, plane.heading, top + 12);
  // Top-right: score, best, rings flown.
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${state.score}`, FIELD.width - 16, top + 20);
  ctx.fillText(`BEST ${best}`, FIELD.width - 16, top + 46);
  const flown = state.rings.filter((r) => r.passed).length;
  ctx.fillStyle = ring ? PALETTE.ringNext : PALETTE.ringDone;
  ctx.fillText(`RING ${flown}/${state.rings.length}`, FIELD.width - 16, top + 72);
  // Mission banner under the compass.
  if (ring) {
    const dist = Math.round(Math.hypot(ring.x - plane.x, ring.z - plane.z));
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText(`SORTIE ${state.sortie} — ${ring.label} · ${dist} m ahead`, FIELD.width / 2, top + 62);
  } else if (state.phase === 'play') {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.good;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText(`ROUTE DONE — LAND ON THE RUNWAY`, FIELD.width / 2, top + 62);
  }
  // Toasts in the middle of the screen.
  ctx.textAlign = 'center';
  let ty = 210;
  for (const message of state.messages) {
    if (state.time > message.until) continue;
    ctx.font = `700 ${message.big ? 30 : 20}px ${FONT}`;
    ctx.fillStyle = message.kind === 'bad' ? PALETTE.danger : message.kind === 'good' ? PALETTE.good : PALETTE.text;
    ctx.fillText(message.text, FIELD.width / 2, ty);
    ty += message.big ? 38 : 28;
  }
  // Bottom instrument panel.
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = 'rgba(20,26,34,0.88)';
  ctx.fillRect(0, 596, FIELD.width, 124);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, 596, FIELD.width, 2);
  dial(ctx, 92, 660, 46, Math.max(0, plane.alt), 0, 400, 'ALTITUDE', 'm', '#58d68d');
  dial(ctx, 212, 660, 46, plane.speed * 3.6, 0, 300, 'AIRSPEED', 'km/h', '#7fb2dd');
  artificialHorizon(ctx, 332, 660, 46, plane.bank, plane.pitch);
  bar(ctx, 420, 620, 26, 76, plane.fuel / 100, plane.fuel < 20 ? PALETTE.danger : PALETTE.good, 'FUEL');
  bar(ctx, 462, 620, 26, 76, 1 - plane.damage / 100, plane.damage > 60 ? PALETTE.danger : PALETTE.warn, 'HULL');
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`WIND ${Math.round(state.wind.speed)} m/s ${state.wind.from}`, 520, 636);
  ctx.fillText(`SORTIE ${state.sortie} · TIME ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, 520, 656);
  ctx.fillText('W/S or wheel: throttle · Arrows/WASD: steer', 520, 676);
  ctx.fillText('Mouse: steer · drag the lever: throttle · P: pause', 520, 696);
  // Throttle lever on the right.
  const r = THROTTLE_RECT;
  ctx.fillStyle = '#0d1218';
  ctx.fillRect(r.x, r.y, r.width, r.height);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(r.x, r.y, r.width, r.height);
  const handleY = r.y + (1 - plane.throttle) * r.height;
  ctx.fillStyle = PALETTE.warn;
  ctx.fillRect(r.x - 6, handleY - 7, r.width + 12, 14);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('THR', r.x + r.width / 2, r.y - 6);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 12px ${FONT}`;
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, r.x + r.width / 2, r.y + r.height + 14);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `700 54px ${FONT}`;
  ctx.fillText(title, FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 19px ${FONT}`;
  let y = 300;
  for (const line of lines) {
    ctx.fillText(line, FIELD.width / 2, y);
    y += 30;
  }
}

export function drawScreen(ctx, state, screen, best) {
  if (screen === 'title') {
    overlay(ctx, 'SKY COURIER', [
      'Kepulauan Run — fly the mail plane over the archipelago',
      `Sortie ${state.sortie}: fly all ${state.rings.length} rings, then land back home.`,
      'Rings pay fuel and points. Storm clouds hurt. Mountains hurt more.',
      'W/S or mouse wheel: throttle · Arrows / WASD / mouse: steer',
      'Drag the THR lever, or hold Shift for full power.',
      `Best score: ${best}`,
      'ENTER or CLICK to fly',
    ], PALETTE.ringNext);
  } else if (screen === 'paused') {
    overlay(ctx, 'PAUSED', ['P or Esc to keep flying', 'R to restart the sortie'], PALETTE.text);
  } else if (screen === 'over') {
    overlay(ctx, 'CRASHED', [
      state.crashReason,
      `Score ${state.score} · Best ${best}`,
      'R or ENTER to fly again',
    ], PALETTE.danger);
  } else if (screen === 'landed') {
    overlay(ctx, 'TOUCHDOWN', [
      'Welcome home, courier. The mail is delivered.',
      `Score ${state.score} · Fuel left ${Math.round(state.plane.fuel)}% · Best ${best}`,
      'ENTER — next sortie (tighter rings, stronger wind)',
    ], PALETTE.good);
  }
}
