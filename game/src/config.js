// NEON HARBOR — config.js
// Original open-world crime game. All names, places and art are original.
export const CFG = {
  WORLD_W: 3200, WORLD_H: 2400,
  VIEW_W: 1280, VIEW_H: 720,
  // v2 visual pass (2026-11-18): the camera zooms 2.5x, so the visible window is
  // ~512x288 world units and cars/people read as big detailed sprites, not dots.
  ZOOM: 2.5,
  ROAD_W: 96, BLOCK: 400,
  PLAYER_SPEED: 175, SPRINT: 295,
  CAR_ACCEL: 430, CAR_BRAKE: 720, CAR_MAX: { sedan: 340, taxi: 330, van: 260, sport: 475, police: 435 },
  CAR_REVERSE: 150, MAX_WANTED: 5, START_CASH: 250,
};
export const CAR_TYPES = {
  sedan:  { w: 46, h: 22, color: '#c94f4f', name: 'Harbor Sedan' },
  taxi:   { w: 46, h: 22, color: '#f2c230', name: 'Harbor Cab' },
  van:    { w: 54, h: 24, color: '#7d8aa0', name: 'Courier Van' },
  sport:  { w: 48, h: 21, color: '#ff2e88', name: 'Vortex GT' },
  police: { w: 47, h: 22, color: '#1c2f6e', name: 'Harbor PD Cruiser' },
};
export const MISSIONS = [
  { id: 1, title: 'MISSION 1 — THE PICKUP', giver: 'Madame Voss',
    brief: 'Pick up the package at the corner of Coral Ave. No noise.',
    objective: 'Drive to the yellow marker and collect the package.', reward: 500 },
  { id: 2, title: 'MISSION 2 — THE GETAWAY', giver: 'Madame Voss',
    brief: 'Detective Kline has your plate. Lose the heat, then get home.',
    objective: 'Lose your wanted level, then reach the safehouse.', reward: 800 },
  { id: 3, title: 'MISSION 3 — THE HARBOR JOB', giver: 'Madame Voss',
    brief: 'One last run. Deliver the goods to Pier 9 before dawn.',
    objective: 'Deliver the goods to the docks at Pier 9.', reward: 1500 },
];
export const PALETTE = {
  asphalt: '#23232e', asphalt2: '#1d1d27', roadLine: '#c9b458',
  sidewalk: '#3a3a48', grass: '#14301f', water: '#0a2a44', water2: '#0d3a5c',
  building: ['#2e2a3d', '#3d2a3a', '#26324a', '#3a2f2a', '#2a3d33'],
  neon: ['#ff2e88', '#00e5ff', '#ffea00', '#7c4dff', '#ff6d00'],
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const SAVE_KEY = 'neon-harbor.save.v1';
