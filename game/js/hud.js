// The 2D HUD overlay: tapes, compass, bars, artificial horizon, minimap, the
// cockpit's six analog gauges, and the title / menu / complete / crash panels.
// Drawn on a 2D canvas layered over the WebGL canvas, in 1280x720 logical space,
// with big readable numbers and nothing ever covering the centre of the screen.
import { FIELD, FONT, MISSIONS, PALETTE, LAYOUT } from './config.js';
import { SCREEN_COMPLETE, SCREEN_MENU, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './screens.js';

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createHud(context) {
  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  function panel(x, y, w, h) {
    context.fillStyle = PALETTE.hudPanel;
    context.beginPath();
    context.roundRect(x, y, w, h, 8);
    context.fill();
  }

  function bar(x, y, w, h, fraction, color, label) {
    text(label, x, y - 4, 12, PALETTE.hudText, 'left');
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(x, y, w, h);
    context.fillStyle = color;
    context.fillRect(x, y, Math.max(0, w * clamp(fraction, 0, 1)), h);
  }

  function tape(x, y, w, h, value, step, unit, label) {
    panel(x - 6, y - 6, w + 12, h + 12);
    const centre = y + h / 2;
    const pxPerStep = 26;
    const base = Math.round(value / step) * step;
    context.save();
    context.beginPath();
    context.rect(x, y, w, h);
    context.clip();
    context.strokeStyle = 'rgba(255, 247, 230, 0.5)';
    context.fillStyle = PALETTE.hudText;
    context.lineWidth = 1;
    for (let offset = -3; offset <= 3; offset += 1) {
      const v = base + offset * step;
      const ty = centre - (value - v) / step * pxPerStep;
      context.beginPath();
      context.moveTo(x + w - 12, ty);
      context.lineTo(x + w, ty);
      context.stroke();
      if (offset % 2 === 0) text(String(v), x + 4, ty + 4, 12, PALETTE.hudText, 'left', 'middle');
    }
    context.restore();
    context.fillStyle = PALETTE.hudAccent;
    context.fillRect(x, centre - 16, w, 32);
    text(String(Math.round(value)), x + w / 2, centre + 7, 20, '#1a0f2e', 'center', 'middle');
    text(label + ' ' + unit, x + w / 2, y + h + 18, 13, PALETTE.hudText, 'center');
  }

  function compass(state) {
    const headingDeg = ((state.plane.heading * 180 / Math.PI) % 360 + 360) % 360;
    const w = 420;
    const x = (FIELD.width - w) / 2;
    const y = 14;
    panel(x - 8, y - 4, w + 16, 34);
    const marks = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
    context.save();
    context.beginPath();
    context.rect(x, y, w, 26);
    context.clip();
    for (const [deg, label] of marks) {
      let diff = deg - headingDeg;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      const mx = x + w / 2 + diff * 2.4;
      if (mx < x - 20 || mx > x + w + 20) continue;
      text(label, mx, y + 19, 14, PALETTE.hudText, 'center', 'middle');
    }
    context.restore();
    context.fillStyle = PALETTE.hudAccent;
    context.beginPath();
    context.moveTo(x + w / 2, y + 26);
    context.lineTo(x + w / 2 - 6, y + 33);
    context.lineTo(x + w / 2 + 6, y + 33);
    context.closePath();
    context.fill();
  }

  function horizon(state) {
    const cx = FIELD.width / 2;
    const cy = FIELD.height - 78;
    const r = 52;
    context.save();
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.clip();
    context.translate(cx, cy);
    context.rotate(-state.plane.roll);
    const horizonY = state.plane.pitch * 60;
    context.fillStyle = '#3d7ec2';
    context.fillRect(-r, -r, r * 2, r + horizonY);
    context.fillStyle = '#8b5a2b';
    context.fillRect(-r, horizonY, r * 2, r - horizonY);
    context.strokeStyle = PALETTE.hudText;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-r, horizonY);
    context.lineTo(r, horizonY);
    context.stroke();
    context.restore();
    context.strokeStyle = PALETTE.hudText;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.hudAccent;
    context.beginPath();
    context.moveTo(cx - 16, cy);
    context.lineTo(cx - 4, cy);
    context.lineTo(cx, cy - 5);
    context.lineTo(cx + 4, cy);
    context.lineTo(cx + 16, cy);
    context.lineTo(cx + 16, cy + 4);
    context.lineTo(cx - 16, cy + 4);
    context.closePath();
    context.fill();
  }

  function minimap(state, missions) {
    const w = 190;
    const h = 118;
    const x = FIELD.width - w - 18;
    const y = FIELD.height - h - 18;
    panel(x - 6, y - 6, w + 12, h + 12);
    const zMax = 1600;
    function mx(wx) { return x + (wx + 600) / 1200 * w; }
    function mz(wz) { return y + h - (wz + 1100) / 1600 * h; }
    context.fillStyle = PALETTE.seaMid;
    context.fillRect(x, y, w, h);
    context.fillStyle = PALETTE.sand;
    for (const isl of [...LAYOUT.islands, LAYOUT.lighthouseIsland]) {
      context.beginPath();
      context.arc(mx(isl.x), mz(isl.z), Math.max(2, isl.r * 0.1), 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.runway;
    for (const s of [...LAYOUT.hopStrips, LAYOUT.strip]) {
      context.fillRect(mx(s.x) - 3, mz(s.z + s.length / 2), 6, Math.max(3, s.length / 1600 * h));
    }
    for (const ring of missions.rings) {
      context.fillStyle = ring.cleared ? '#7ee081' : PALETTE.ring;
      context.beginPath();
      context.arc(mx(ring.x), mz(ring.z), ring.cleared ? 3 : 4.5, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.lightRed;
    context.beginPath();
    context.arc(mx(LAYOUT.lighthouse.x), mz(LAYOUT.lighthouse.z), 4, 0, Math.PI * 2);
    context.fill();
    const p = state.plane;
    context.save();
    context.translate(mx(p.x), mz(p.z));
    context.rotate(-p.heading);
    context.fillStyle = PALETTE.hudText;
    context.beginPath();
    context.moveTo(0, -7);
    context.lineTo(5, 6);
    context.lineTo(-5, 6);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawHud(state, missions, best, time) {
    const p = state.plane;
    const speedKt = Math.round(p.speed * 1.9);
    const altFt = Math.round(p.y * 12);
    tape(18, 120, 64, 300, speedKt, 10, 'KT', 'SPD');
    tape(FIELD.width - 82, 120, 64, 300, altFt, 100, 'FT', 'ALT');
    compass(state);
    panel(18, FIELD.height - 118, 168, 104);
    bar(24, FIELD.height - 96, 150, 12, p.throttle, PALETTE.hudAccent, 'THR');
    bar(24, FIELD.height - 62, 150, 12, p.fuel / 100, p.fuel < 20 ? PALETTE.hudDanger : '#7ee081', 'FUEL');
    bar(24, FIELD.height - 28, 150, 12, 1 - p.damage / 100, p.damage > 60 ? PALETTE.hudDanger : '#7ee081', 'HULL');
    horizon(state);
    minimap(state, missions);
    const mins = Math.floor(state.elapsed / 60);
    const secs = Math.floor(state.elapsed % 60);
    const clock = mins + ':' + String(secs).padStart(2, '0');
    text(state.mission.name, 24, 30, 22, PALETTE.hudText, 'left');
    let objective = '';
    if (state.mission.id === 'rings') {
      const next = missions.nextRing(state);
      objective = next ? 'Ring ' + (state.ringsCleared + 1) + ' of 8  ·  ' + Math.round(next.dist) + ' m' : 'All rings clear';
    } else if (state.mission.id === 'drop') {
      objective = state.crateDropped ? 'Crate away — watch the pad' : 'Drop the crate on the lighthouse pad';
    } else if (state.mission.id === 'hop') {
      objective = 'Strips landed ' + state.stripsLanded + ' of 3';
    } else {
      objective = 'Land on the Coastal Strip';
    }
    text(objective + '   ·   T+ ' + clock, 24, 56, 15, PALETTE.muted, 'left');
    text('SCORE ' + state.score, FIELD.width - 24, 30, 22, PALETTE.hudText, 'right');
    text('RINGS ' + state.ringsCleared + '/8', FIELD.width - 24, 56, 15, PALETTE.muted, 'right');
    if (state.messageTimer > 0 && state.message) {
      const alpha = clamp(state.messageTimer, 0, 1);
      context.globalAlpha = alpha;
      text(state.message, FIELD.width / 2, 84, 24, PALETTE.hudAccent, 'center');
      context.globalAlpha = 1;
    }
    if (p.speed < 26 && !p.grounded) text('STALL', FIELD.width / 2, 116, 22, PALETTE.hudDanger, 'center');
    if (p.fuel < 20) text('LOW FUEL', FIELD.width / 2, 140, 18, PALETTE.hudDanger, 'center');
    if (p.fuel <= 0) text('ENGINE OUT', FIELD.width / 2, 164, 18, PALETTE.hudDanger, 'center');
    text('W/S pitch · A/D roll · Q/E yaw · Shift/Ctrl throttle · Space drop · C camera · R restart', FIELD.width / 2, FIELD.height - 10, 13, PALETTE.muted, 'center');
  }

  // The cockpit: a dark panel across the bottom with six round gauges, warning
  // lights, and windshield pillars framing the 3D world ahead.
  function gauge(cx, cy, r, label, value, min, max, format) {
    context.fillStyle = '#14101f';
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.hudText;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.hudText;
    context.beginPath();
    context.arc(cx, cy, 3, 0, Math.PI * 2);
    context.fill();
    const angle = -Math.PI * 0.75 + (clamp(value, min, max) - min) / (max - min) * Math.PI * 1.5;
    context.strokeStyle = PALETTE.hudAccent;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx + Math.cos(angle) * (r - 8), cy + Math.sin(angle) * (r - 8));
    context.stroke();
    text(label, cx, cy + r + 16, 12, PALETTE.muted, 'center');
    text(format(value), cx, cy - r - 8, 13, PALETTE.hudText, 'center');
  }

  function attitudeGauge(cx, cy, r, state) {
    context.save();
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.clip();
    context.translate(cx, cy);
    context.rotate(-state.plane.roll);
    const horizonY = state.plane.pitch * r * 0.5;
    context.fillStyle = '#3d7ec2';
    context.fillRect(-r, -r, r * 2, r + horizonY);
    context.fillStyle = '#8b5a2b';
    context.fillRect(-r, horizonY, r * 2, r - horizonY);
    context.strokeStyle = PALETTE.hudText;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-r, horizonY);
    context.lineTo(r, horizonY);
    context.stroke();
    context.restore();
    context.strokeStyle = PALETTE.hudText;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.hudAccent;
    context.beginPath();
    context.moveTo(cx - 14, cy);
    context.lineTo(cx + 14, cy);
    context.lineTo(cx + 14, cy + 4);
    context.lineTo(cx - 14, cy + 4);
    context.closePath();
    context.fill();
    text('ATT', cx, cy + r + 16, 12, PALETTE.muted, 'center');
  }

  function drawCockpit(state, time) {
    const p = state.plane;
    const panelTop = FIELD.height - 208;
    context.fillStyle = '#14101f';
    context.fillRect(0, panelTop, FIELD.width, 208);
    context.fillStyle = PALETTE.panelLine;
    context.fillRect(0, panelTop, FIELD.width, 3);
    const gy = panelTop + 78;
    gauge(150, gy, 44, 'AIRSPEED', p.speed * 1.9, 0, 180, (v) => Math.round(v) + ' KT');
    attitudeGauge(340, gy, 44, state);
    gauge(530, gy, 44, 'ALTITUDE', p.y * 12, 0, 1200, (v) => Math.round(v) + ' FT');
    gauge(720, gy, 44, 'COMPASS', ((p.heading * 180 / Math.PI) % 360 + 360) % 360, 0, 360, (v) => Math.round(v) + '°');
    gauge(900, gy, 44, 'VERT SPEED', p.vy * 12, -60, 60, (v) => (v >= 0 ? '+' : '') + Math.round(v) + ' FPM');
    gauge(1080, gy, 44, 'FUEL', p.fuel, 0, 100, (v) => Math.round(v) + '%');
    const warnings = [];
    if (p.speed < 26 && !p.grounded) warnings.push(['STALL', PALETTE.hudDanger]);
    if (p.fuel < 20) warnings.push(['LOW FUEL', PALETTE.hudDanger]);
    if (p.fuel <= 0) warnings.push(['ENGINE', PALETTE.hudDanger]);
    if (p.damage > 60) warnings.push(['HULL', PALETTE.hudDanger]);
    warnings.forEach((warn, i) => {
      const on = Math.floor(time * 3) % 2 === 0;
      context.fillStyle = on ? warn[1] : '#5a2020';
      context.beginPath();
      context.arc(1200, panelTop + 26 + i * 26, 8, 0, Math.PI * 2);
      context.fill();
      text(warn[0], 1216, panelTop + 30 + i * 26, 12, PALETTE.hudText, 'left');
    });
    // Windshield pillars (the 3D cockpit frame is also in the scene).
    context.fillStyle = '#14101f';
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(90, 0);
    context.lineTo(150, panelTop);
    context.lineTo(0, panelTop);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(FIELD.width, 0);
    context.lineTo(FIELD.width - 90, 0);
    context.lineTo(FIELD.width - 150, panelTop);
    context.lineTo(FIELD.width, panelTop);
    context.closePath();
    context.fill();
    // No centre pillar here — the 3D cockpit frame carries the pillars.
  }

  function drawCockpitHud(state) {
    const p = state.plane;
    text(state.mission.name, 170, 30, 22, PALETTE.hudText, 'left');
    text('SCORE ' + state.score, FIELD.width - 170, 30, 22, PALETTE.hudText, 'right');
    if (state.messageTimer > 0 && state.message) {
      const alpha = clamp(state.messageTimer, 0, 1);
      context.globalAlpha = alpha;
      text(state.message, FIELD.width / 2, 84, 24, PALETTE.hudAccent, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt, width, lineSize) {
    const w = width || 640;
    const size = lineSize || 20;
    const lineH = 34;
    const height = 150 + lines.length * lineH + 70;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20, 12, 40, 0.88)';
    context.beginPath();
    context.roundRect(x, y, w, height, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelLine;
    context.lineWidth = 2;
    context.stroke();
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.hudText, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 128 + index * lineH, size, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.hudAccent, 'center');
  }

  // Paint the HUD and the screen panels over the 3D world the renderer drew.
  function draw(state, screen, missions, best, time, selectedMission) {
    if (screen === SCREEN_PLAY) {
      if (state.camera === 'cockpit') {
        drawCockpit(state, time);
        drawCockpitHud(state);
      } else {
        drawHud(state, missions, best, time);
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawHud(state, missions, best, time);
      drawPanel('PAUSED', ['The bay will wait for you.'], 'Press P to resume');
      return;
    }
    if (screen === SCREEN_TITLE) {
      text('KARST BAY COURIER', FIELD.width / 2, 150, 64, PALETTE.hudText, 'center');
      text('A bush-plane courier run over a karst bay at golden hour', FIELD.width / 2, 196, 22, PALETTE.hudAccent, 'center');
      text('Press Enter to choose a mission', FIELD.width / 2, 620, 24, PALETTE.hudText, 'center');
      if (best > 0) text('Best score ' + best, FIELD.width / 2, 656, 18, PALETTE.muted, 'center');
      return;
    }
    if (screen === SCREEN_MENU) {
      const lines = MISSIONS.map((mission, index) => {
        const mark = index === selectedMission ? '▶ ' : '   ';
        return mark + mission.name + ' — ' + mission.blurb;
      });
      drawPanel('CHOOSE A MISSION', lines, 'Up / Down to choose · Enter to fly', 780, 18);
      return;
    }
    if (screen === SCREEN_COMPLETE) {
      drawPanel('MISSION COMPLETE — ' + state.rank, [
        'Score ' + state.score,
        'Rings ' + state.ringsCleared + ' of 8 · Strips ' + state.stripsLanded + ' of 3',
        'Fuel left ' + Math.round(state.plane.fuel) + '% · Damage ' + Math.round(state.plane.damage) + '%',
        '',
      ], 'Enter for the menu · R to fly again');
      return;
    }
    if (screen === SCREEN_OVER) {
      drawPanel('CRASHED', [
        state.message || 'The courier went down.',
        'Score ' + state.score + ' · Rings ' + state.ringsCleared + ' of 8',
        '',
      ], 'Press R to try again');
    }
  }

  return { draw };
}
