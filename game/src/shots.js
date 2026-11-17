// NEON HARBOR — shots.js : deterministic screenshot scenes.
// Each scene stages the real world, then simulates it forward with a simple
// autopilot (steer toward the target, throttle on), so the frame is what a
// real game looks like — same seed, same frame.
import { CFG } from './config.js';
import { MARKERS } from './world.js';
import { SCREEN_PLAY } from './render.js';

const STEP = 1 / 60;

function driveCtl(world, tx, ty) {
  const p = world.state.player, car = p.inCar;
  if (!car) return { up: false, down: false, left: false, right: false, sprint: false, enter: false, shoot: false, fireHeld: false, aimAngle: 0 };
  const target = Math.atan2(ty - car.y, tx - car.x);
  let diff = target - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { up: true, down: false, left: diff < -0.08, right: diff > 0.08, sprint: false, enter: false, shoot: false, fireHeld: false, aimAngle: car.angle };
}
function idleCtl() {
  return { up: false, down: false, left: false, right: false, sprint: false, enter: false, shoot: false, fireHeld: false, aimAngle: -Math.PI / 2 };
}
function run(world, seconds, ctlFn) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) world.step(STEP, ctlFn(i), null);
}
function placePolice(world, x, y, angle) {
  const c = world.state.cars.find((cc) => cc.police && cc.wrecked === false && Math.abs(cc.x - x) < 5 && Math.abs(cc.y - y) < 5);
  if (c) { c.x = x; c.y = y; c.angle = angle; c.speed = 200; return c; }
  return null;
}

export function stageShot(name, world) {
  const s = world.state, p = s.player;
  s.gameOver = null; s.bannerT = 0; s.banner = '';
  s.time = 42; // fixed dusk light, flashing police lights mid-cycle
  s.clockMin = 19 * 60 + 42;

  if (name === 'street') {
    // On foot on the sidewalk downtown, 1 star, traffic + pedestrians everywhere.
    p.x = 1078; p.y = 930; p.angle = Math.PI / 2; p.inCar = null; p.health = 100; p.ammo = 24;
    s.wanted = 1; s.missionIndex = 0; s.missionMsg = 'Drive to the yellow marker and collect the package.';
    s.banner = 'Madame Voss: keep it quiet, Jace.'; s.bannerT = 3;
    run(world, 3, () => idleCtl());
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // High-speed chase, 4 stars, roadblock ahead, smoke + skid marks.
    const car = s.heroCar;
    car.x = 900; car.y = 1000; car.angle = 0; car.speed = 380; car.health = 62; car.wrecked = false;
    p.inCar = car; p.x = car.x; p.y = car.y; p.health = 78; p.ammo = 12;
    s.wanted = 4; s.missionIndex = 1; s.missionMsg = 'Lose the heat — stay out of sight of the police.';
    s.banner = '4 STARS — PD ROADBLOCK AHEAD'; s.bannerT = 3;
    run(world, 1.2, () => driveCtl(world, 2600, 1000));
    // roadblock: two cruisers parked across the avenue ahead of the player
    // (placed after the simulation so they stay exactly in frame).
    // v2: visible window is only ~512 world units wide, so +400 was off-frame; +220 sits near the right edge.
    const bx = p.x + 220;
    for (const [ox, oy, ang] of [[bx, 962, Math.PI / 2], [bx + 8, 1038, Math.PI / 2]]) {
      const c = { type: 'police', x: ox, y: oy, angle: ang, speed: 0, w: 47, h: 22, color: '#1c2f6e', health: 100, wrecked: false, traffic: false, axis: null, dir: 1, lane: 0, police: true, siren: 0, smoke: 0 };
      s.cars.push(c);
    }
    for (let i = 0; i < 16; i++) s.skids.push({ x: p.x - i * 14, y: 1000 + (i % 3) * 4 - 4, angle: 0, life: 5 });
    for (let i = 0; i < 12; i++) s.particles.push({ x: p.x - 24 + i * 3, y: 992, vx: -10, vy: -24, life: 1.4, max: 1.6, color: '#666', size: 9, smoke: true });
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // The pickup moment: Jace at the yellow marker, mission banner up.
    const car = s.heroCar;
    car.x = 980; car.y = 700; car.angle = -Math.PI / 2; car.speed = 0; car.health = 100; car.wrecked = false;
    p.inCar = null; p.x = 1024; p.y = 706; p.angle = -0.9; p.health = 100; p.ammo = 24;
    s.wanted = 0; s.missionIndex = 0;
    s.missionMsg = 'Drive to the yellow marker and collect the package.';
    s.banner = 'MISSION 1 — THE PICKUP'; s.bannerT = 4;
    run(world, 1.5, () => idleCtl());
    return { screen: SCREEN_PLAY };
  }
  // cover (default): Jace in the Vortex GT down a neon avenue at dusk,
  // 3 stars, two cruisers chasing, mission text live.
  const car = s.heroCar;
  car.x = 620; car.y = 600; car.angle = 0; car.speed = 300; car.health = 100; car.wrecked = false;
  p.inCar = car; p.x = car.x; p.y = car.y; p.health = 100; p.ammo = 24; p.cash = 1250;
  s.wanted = 3; s.missionIndex = 0;
  s.missionMsg = 'Drive to the yellow marker and collect the package.';
  s.banner = 'MISSION 1 — THE PICKUP'; s.bannerT = 4;
  run(world, 2.2, () => driveCtl(world, 2400, 600));
  // make sure two cruisers are visibly on our tail
  // v2: at 2.5x zoom the trailing cops must sit closer (-90/-150, not -150/-240) to stay in frame.
  const cops = s.cars.filter((c) => c.police && !c.wrecked);
  cops.slice(0, 2).forEach((c, i) => { c.x = p.x - 90 - i * 60; c.y = 600 + (i === 0 ? 26 : -24); c.angle = 0; c.speed = 330; });
  run(world, 0.3, () => driveCtl(world, 2400, 600));
  return { screen: SCREEN_PLAY };
}
