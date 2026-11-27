// Dense 2D HUD overlay: compass tape, big SPD/ALT/VSI, bars, radar, rings/timer/score/pay,
// tower dialog, 6 analog gauges, plus title / mission-select / complete / crash screens.
import { MISSIONS, fmtTime } from './config.js';

function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

export function buildHUD() {
  const root = document.getElementById('hud');
  const top = el('div', 'hud-top', root);
  const missionEl = el('div', 'hud-mission', top);
  const compassWrap = el('div', 'hud-compass', top);
  const compass = document.createElement('canvas');
  compass.width = 360; compass.height = 34;
  compassWrap.appendChild(compass);
  const right = el('div', 'hud-right', top);
  const scoreEl = el('div', 'hud-score', right);
  const ringsEl = el('div', 'hud-rings', right);
  const timerEl = el('div', 'hud-timer', right);
  const payEl = el('div', 'hud-pay', right);

  const left = el('div', 'hud-left', root);
  const spdLabel = el('div', 'hud-label', left, 'SPD');
  const spdEl = el('div', 'hud-big', left, '86');
  const spdUnit = el('div', 'hud-unit', left, 'KT');
  const vsiLabel = el('div', 'hud-label', left, 'VSI');
  const vsiEl = el('div', 'hud-med', left, '+120');
  const vsiUnit = el('div', 'hud-unit', left, 'FT/MIN');

  const rightCol = el('div', 'hud-rightcol', root);
  const altLabel = el('div', 'hud-label', rightCol, 'ALT');
  const altEl = el('div', 'hud-big', rightCol, '1840');
  const altUnit = el('div', 'hud-unit', rightCol, 'FT');
  const hdgLabel = el('div', 'hud-label', rightCol, 'HDG');
  const hdgEl = el('div', 'hud-med', rightCol, '270°');
  const ringLabel = el('div', 'hud-label', rightCol, 'NEXT RING');
  const ringEl = el('div', 'hud-ring', rightCol, 'RING 3 • 0.4 NM');

  const bars = el('div', 'hud-bars', root);
  const thrRow = el('div', 'hud-bar-row', bars);
  el('span', 'hud-bar-label', thrRow, 'THR');
  const thrBar = el('div', 'hud-bar', thrRow);
  const thrFill = el('div', 'hud-fill thr', thrBar);
  const fuelRow = el('div', 'hud-bar-row', bars);
  el('span', 'hud-bar-label', fuelRow, 'FUEL');
  const fuelBar = el('div', 'hud-bar', fuelRow);
  const fuelFill = el('div', 'hud-fill fuel', fuelBar);
  const hullRow = el('div', 'hud-bar-row', bars);
  el('span', 'hud-bar-label', hullRow, 'HULL');
  const hullBar = el('div', 'hud-bar', hullRow);
  const hullFill = el('div', 'hud-fill hull', hullBar);

  // Artificial horizon + radar (bottom centre / bottom right), tower dialog, hint line.
  const horizonWrap = el('div', 'hud-horizon', root);
  const horizon = document.createElement('canvas');
  horizon.width = 150; horizon.height = 84;
  horizonWrap.appendChild(horizon);
  const radarWrap = el('div', 'hud-radar', root);
  const radar = document.createElement('canvas');
  radar.width = 118; radar.height = 118;
  radarWrap.appendChild(radar);
  const dialogEl = el('div', 'hud-dialog', root);
  const hintEl = el('div', 'hud-hint', root, 'W/S pitch · A/D roll · Q/E yaw · Shift/Ctrl throttle · Space drop · C camera · R restart');

  // Cockpit gauges: 6 analog dials along the bottom (visible in cockpit view).
  const gaugesWrap = el('div', 'hud-gauges', root);
  const gauges = [];
  const gaugeDefs = [
    { label: 'AIRSPEED', min: 0, max: 160, unit: 'KT' },
    { label: 'ATTITUDE', min: -30, max: 30, unit: '°' },
    { label: 'ALTIMETER', min: 0, max: 4000, unit: 'FT' },
    { label: 'COMPASS', min: 0, max: 360, unit: '°' },
    { label: 'VERT SPEED', min: -1000, max: 1000, unit: 'FPM' },
    { label: 'FUEL', min: 0, max: 100, unit: '%' },
  ];
  for (const def of gaugeDefs) {
    const wrap = el('div', 'hud-gauge', gaugesWrap);
    const cv = document.createElement('canvas');
    cv.width = 74; cv.height = 74;
    wrap.appendChild(cv);
    el('div', 'hud-gauge-label', wrap, def.label);
    gauges.push({ ...def, cv });
  }

  // Full screens: title, mission menu, complete, crashed.
  const titleScr = el('div', 'screen screen-title', root);
  el('div', 'screen-kicker', titleScr, 'KARST BAY · COURIER SERVICE');
  el('h1', 'screen-title-big', titleScr, 'KARST BAY COURIER');
  el('div', 'screen-sub', titleScr, 'Mail, storm and night runs between the karst towers.');
  el('div', 'screen-press', titleScr, 'Press Enter to fly');
  const menuScr = el('div', 'screen screen-menu', root);
  el('h2', 'screen-menu-title', menuScr, 'CHOOSE A CONTRACT');
  const cards = el('div', 'screen-cards', menuScr);
  const cardEls = [];
  for (const m of MISSIONS) {
    const card = el('div', 'screen-card', cards);
    el('div', 'card-name', card, m.name);
    el('div', 'card-rings', card, m.rings + ' RINGS');
    el('div', 'card-weather', card, m.weather);
    el('div', 'card-desc', card, m.desc);
    el('div', 'card-pay', card, 'CR ' + m.pay);
    el('button', 'card-start', card, 'START');
    cardEls.push(card);
  }
  const endScr = el('div', 'screen screen-end', root);
  const endTitle = el('h2', 'screen-end-title', endScr);
  const endReason = el('div', 'screen-end-reason', endScr);
  const endStats = el('div', 'screen-end-stats', endScr);
  el('div', 'screen-press', endScr, 'Press R to fly again');

  return {
    root, missionEl, compass, scoreEl, ringsEl, timerEl, payEl,
    spdEl, vsiEl, altEl, hdgEl, ringEl, thrFill, fuelFill, hullFill,
    horizon, radar, dialogEl, gauges, titleScr, menuScr, endScr,
    endTitle, endReason, endStats, cardEls,
  };
}

function drawCompass(cv, heading) {
  const x = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(6,12,20,0.55)';
  x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,0.9)';
  x.fillStyle = '#fff';
  x.font = 'bold 13px system-ui, sans-serif';
  x.textAlign = 'center';
  const pxPerDeg = 3.2;
  const centre = W / 2;
  for (let d = -60; d <= 60; d += 5) {
    let h = Math.round(heading + d);
    h = ((h % 360) + 360) % 360;
    const px = centre + d * pxPerDeg;
    const major = h % 30 === 0;
    x.beginPath();
    x.moveTo(px, major ? 4 : 10);
    x.lineTo(px, major ? 20 : 16);
    x.stroke();
    if (major && Math.abs(d) > 10) {
      const label = h === 0 ? 'N' : h === 90 ? 'E' : h === 180 ? 'S' : h === 270 ? 'W' : String(h).padStart(3, '0');
      x.fillText(label, px, 31);
    }
  }
  x.fillStyle = '#ffd21f';
  x.beginPath();
  x.moveTo(centre - 6, 0); x.lineTo(centre + 6, 0); x.lineTo(centre, 8); x.closePath();
  x.fill();
  x.font = 'bold 13px system-ui, sans-serif';
  x.fillText(String(Math.round(heading)).padStart(3, '0') + '°', centre, H - 2);
}

function drawHorizon(cv, roll, pitch) {
  const x = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  x.clearRect(0, 0, W, H);
  x.save();
  x.beginPath();
  x.arc(W / 2, H / 2, Math.min(W, H) / 2 - 2, 0, Math.PI * 2);
  x.clip();
  x.translate(W / 2, H / 2);
  x.rotate(roll);
  x.translate(0, pitch * 0.9);
  x.fillStyle = '#3a7ac8';
  x.fillRect(-W, -H, W * 2, H);
  x.fillStyle = '#8a5a34';
  x.fillRect(-W, 0, W * 2, H);
  x.strokeStyle = '#fff';
  x.lineWidth = 2;
  x.beginPath(); x.moveTo(-W, 0); x.lineTo(W, 0); x.stroke();
  x.restore();
  x.strokeStyle = '#ffd21f';
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(W / 2 - 16, H / 2); x.lineTo(W / 2 - 4, H / 2);
  x.moveTo(W / 2 + 4, H / 2); x.lineTo(W / 2 + 16, H / 2);
  x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.85)';
  x.beginPath();
  x.arc(W / 2, H / 2, Math.min(W, H) / 2 - 2, 0, Math.PI * 2);
  x.stroke();
}

function drawRadar(cv, planePos, heading, rings, ringIndex, lighthouse) {
  const x = cv.getContext('2d');
  const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W / 2 - 4;
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(6,18,12,0.6)';
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(120,255,170,0.7)';
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(cx, cy, R / 2, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.stroke();
  x.beginPath(); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
  const scale = R / 320;
  const plot = (wx, wz, color, r) => {
    const dx = (wx - planePos.x) * scale, dz = (wz - planePos.z) * scale;
    const h = (heading * Math.PI) / 180;
    const rx = dx * Math.cos(h) - dz * Math.sin(h);
    const rz = dx * Math.sin(h) + dz * Math.cos(h);
    x.fillStyle = color;
    x.beginPath(); x.arc(cx + rx, cy + rz, r, 0, Math.PI * 2); x.fill();
  };
  for (let i = ringIndex; i < Math.min(rings.length, ringIndex + 4); i++) {
    plot(rings[i].x, rings[i].z, i === ringIndex ? '#ffd21f' : 'rgba(255,210,31,0.45)', i === ringIndex ? 4 : 3);
  }
  plot(lighthouse.x, lighthouse.z, '#ff5a5a', 4);
  x.fillStyle = '#fff';
  x.beginPath();
  x.moveTo(cx, cy - 6); x.lineTo(cx - 4, cy + 5); x.lineTo(cx + 4, cy + 5); x.closePath();
  x.fill();
}

function drawGauge(g, value) {
  const x = g.cv.getContext('2d');
  const W = g.cv.width, H = g.cv.height, cx = W / 2, cy = H / 2 + 4, R = 30;
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(8,12,18,0.72)';
  x.beginPath(); x.arc(cx, cy, R + 3, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#e8e8e8';
  x.lineWidth = 2;
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
  const frac = Math.max(0, Math.min(1, (value - g.min) / (g.max - g.min)));
  const ang = -Math.PI * 0.75 + frac * Math.PI * 1.5;
  x.strokeStyle = '#ffd21f';
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx + Math.cos(ang) * (R - 5), cy + Math.sin(ang) * (R - 5));
  x.stroke();
  x.fillStyle = '#fff';
  x.font = 'bold 11px system-ui, sans-serif';
  x.textAlign = 'center';
  const shown = g.label === 'COMPASS' ? Math.round(value) + '°' : Math.round(value);
  x.fillText(String(shown), cx, cy + R - 8);
}

export function updateHUD(h, s) {
  h.missionEl.textContent = s.mission.name.toUpperCase() + ' · ' + s.mission.weather;
  h.scoreEl.textContent = 'SCORE ' + s.score;
  h.ringsEl.textContent = 'RINGS ' + s.ringsHit + '/' + s.mission.rings;
  h.timerEl.textContent = fmtTime(s.timer);
  h.payEl.textContent = 'CR ' + s.mission.pay;
  h.spdEl.textContent = String(Math.round(s.spd));
  h.vsiEl.textContent = (s.vsi >= 0 ? '+' : '') + String(Math.round(s.vsi));
  h.altEl.textContent = String(Math.round(s.alt));
  h.hdgEl.textContent = String(Math.round(s.heading)).padStart(3, '0') + '°';
  const cmd = s.command || 'STRAIGHT AHEAD';
  h.ringEl.textContent = 'RING ' + (s.ringIndex + 1) + ' • ' + s.ringDist + ' NM • ' + cmd;
  h.thrFill.style.width = Math.round(s.throttle * 100) + '%';
  h.fuelFill.style.width = Math.round(s.fuel) + '%';
  h.hullFill.style.width = Math.round(s.hull) + '%';
  h.dialogEl.textContent = s.dialog || '';
  drawCompass(h.compass, s.heading);
  drawHorizon(h.horizon, s.roll, s.pitch);
  drawRadar(h.radar, s.planePos, s.heading, s.rings, s.ringIndex, s.lighthouse);
  const vals = [s.spd, s.pitchDeg, s.alt, s.heading, s.vsi, s.fuel];
  h.gauges.forEach((g, i) => drawGauge(g, vals[i]));
  h.root.querySelector('.hud-gauges').style.display = s.cockpit ? 'flex' : 'none';
  h.horizon.parentElement.style.display = s.cockpit ? 'none' : 'block';
}

export function showScreen(h, name, data) {
  const show = (e, on) => { e.style.display = on ? 'flex' : 'none'; };
  show(h.titleScr, name === 'title');
  show(h.menuScr, name === 'menu');
  show(h.endScr, name === 'complete' || name === 'crashed');
  if (name === 'complete' || name === 'crashed') {
    h.endTitle.textContent = data.title;
    h.endReason.textContent = data.reason || '';
    h.endStats.textContent = 'RANK ' + data.rank + '  ·  SCORE ' + data.score + '  ·  RINGS ' + data.ringsHit + '/' + data.ringsTotal + '  ·  TIME ' + fmtTime(data.timeSec) + '  ·  PAY CR ' + data.pay;
  }
  h.root.classList.toggle('in-menu', name === 'menu' || name === 'title');
  const hideChrome = name === 'menu' || name === 'title';
  h.root.querySelector('.hud-rightcol').style.display = hideChrome ? 'none' : 'block';
}
