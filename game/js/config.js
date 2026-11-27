// Karst Bay Courier — shared constants: field size, palette, missions, world layout.
// The layout is the single source of truth for where things sit in the 3D bay, so the
// world, the missions, the HUD minimap and the screenshot scenes all agree.
export const FIELD = { width: 1280, height: 720 };

export const PALETTE = {
  hudPanel: 'rgba(16, 10, 36, 0.72)',
  hudText: '#fff7e6',
  hudAccent: '#ffc93c',
  hudDanger: '#ff5a4e',
  muted: 'rgba(255, 247, 230, 0.72)',
  panelLine: '#ffc93c',
  seaMid: '#1f7f86',
  sand: '#e8d29a',
  runway: '#2c2c34',
  ring: '#ffc93c',
  lightRed: '#ff5a4e',
};

export const FONT = 'system-ui, sans-serif';

export const MISSIONS = [
  { id: 'rings', name: 'RING RUN', blurb: 'Fly all 8 rings through the karst towers' },
  { id: 'drop', name: 'LIGHTHOUSE SUPPLY DROP', blurb: 'Drop the crate on the lighthouse pad' },
  { id: 'hop', name: 'ISLAND HOP', blurb: 'Land on 3 island strips' },
  { id: 'land', name: 'CROSSWIND LANDING', blurb: 'Land on the coastal strip in a crosswind' },
];

// World layout in metres. Sea level is y = 0. Forward (heading 0) is -Z (north).
// The plane starts south of the bay and flies north into it.
export const LAYOUT = {
  start: { x: 0, y: 110, z: 500, heading: 0 },
  lighthouse: { x: 150, z: -330 },
  pad: { x: 150, z: -270 },
  lighthouseIsland: { x: 150, z: -300, r: 95 },
  strip: { x: -300, z: -200, heading: Math.PI / 2, length: 320 },
  hopStrips: [
    { x: -250, z: 300, heading: 0, length: 170 },
    { x: 300, z: 100, heading: Math.PI / 2, length: 170 },
    { x: -100, z: -900, heading: 0, length: 170 },
  ],
  karst: [
    { x: -200, z: -100, h: 220, r: 34 },
    { x: -80, z: -420, h: 280, r: 40 },
    { x: 260, z: -520, h: 190, r: 30 },
    { x: -360, z: -620, h: 250, r: 36 },
    { x: 60, z: -820, h: 300, r: 44 },
    { x: 360, z: -220, h: 170, r: 28 },
    { x: -160, z: 120, h: 150, r: 26 },
    { x: 420, z: 420, h: 200, r: 32 },
  ],
  islands: [
    { x: -250, z: 300, r: 70 },
    { x: 300, z: 100, r: 80 },
    { x: -100, z: -900, r: 75 },
    { x: 450, z: -700, r: 65 },
    { x: -480, z: 350, r: 60 },
  ],
  rings: [
    { x: 0, y: 95, z: 200 },
    { x: -120, y: 100, z: -80 },
    { x: 40, y: 110, z: -380 },
    { x: -220, y: 95, z: -560 },
    { x: 120, y: 120, z: -700 },
    { x: -40, y: 100, z: -950 },
    { x: 200, y: 110, z: -500 },
    { x: -300, y: 105, z: -300 },
  ],
  // Low golden-hour sun from the west-northwest.
  sunDir: { x: -0.72, y: 0.20, z: -0.58 },
  mountains: [
    { x: -1400, z: -2200, h: 700, r: 900 },
    { x: 300, z: -2600, h: 850, r: 1100 },
    { x: 1800, z: -1800, h: 600, r: 800 },
    { x: -2200, z: 400, h: 550, r: 750 },
    { x: 2200, z: 900, h: 650, r: 850 },
  ],
};
