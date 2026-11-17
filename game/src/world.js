// NEON HARBOR — world.js : the city, its people, cars, police, wanted level and missions.
// No drawing here — state and rules only. All places, names and art are original.
// v2 visual pass (2026-11-18): rules untouched — only render.js reads the same state closer up.
import { CFG, CAR_TYPES, MISSIONS, PALETTE } from './config.js';
import { mulberry32, pick, range, clamp, dist, angDiff, lerp } from './random.js';

export const ROADS_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROADS_Y = [200, 600, 1000, 1400, 1800, 2200];
export const HARBOR_Y = 2140; // below this line: water, piers and docks
export const MARKERS = {
  pickup: { x: 1060, y: 660, label: 'PICKUP' },
  safehouse: { x: 640, y: 1840, label: 'SAFEHOUSE' },
  pier: { x: 1640, y: 2260, label: 'PIER 9' },
};

export function isRoad(x, y) {
  if (y >= HARBOR_Y) return false;
  for (const rx of ROADS_X) if (Math.abs(x - rx) < CFG.ROAD_W / 2) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < CFG.ROAD_W / 2) return true;
  return false;
}
function onRoadAxis(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) < CFG.ROAD_W / 2) return 'v';
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < CFG.ROAD_W / 2) return 'h';
  return null;
}

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [], parks = [], signs = [], lamps = [], trees = [];
  // City blocks: between road lines, 1-3 buildings each, some blocks are parks.
  for (let bx = 0; bx < ROADS_X.length - 1; bx++) {
    for (let by = 0; by < ROADS_Y.length - 1; by++) {
      const x0 = ROADS_X[bx] + CFG.ROAD_W / 2 + 14, x1 = ROADS_X[bx + 1] - CFG.ROAD_W / 2 - 14;
      const y0 = ROADS_Y[by] + CFG.ROAD_W / 2 + 14, y1 = ROADS_Y[by + 1] - CFG.ROAD_W / 2 - 14;
      if (y0 > HARBOR_Y - 80) continue;
      const r = rng();
      if (r < 0.16) { // park
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const n = 5 + Math.floor(rng() * 5);
        for (let i = 0; i < n; i++) trees.push({ x: range(rng, x0 + 20, x1 - 20), y: range(rng, y0 + 20, y1 - 20), r: 10 + rng() * 8 });
        continue;
      }
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const bw = (x1 - x0) / n - 12, bh = (y1 - y0) * (0.55 + rng() * 0.4);
        const bx0 = x0 + i * ((x1 - x0) / n) + 6;
        const by0 = y0 + range(rng, 4, Math.max(5, (y1 - y0) - bh - 4));
        buildings.push({
          x: bx0, y: by0, w: bw, h: bh,
          color: pick(rng, PALETTE.building),
          neon: rng() < 0.55 ? pick(rng, PALETTE.neon) : null,
          tall: rng() < 0.25, winSeed: Math.floor(rng() * 1e9),
        });
      }
    }
  }
  // Neon signs + street lamps along the avenues.
  const signWords = ['NEON', 'HARBOUR', 'PIER 9', 'VOSS', '24H', 'DINE', 'HOTEL', 'CLUB', 'TAXI', 'BAR', 'NOODLE', 'CASINO'];
  for (let i = 0; i < 46; i++) {
    const rx = pick(rng, ROADS_X), ry = pick(rng, ROADS_Y);
    signs.push({ x: rx + (rng() < 0.5 ? -1 : 1) * (CFG.ROAD_W / 2 + 16), y: ry + range(rng, -160, 160), text: pick(rng, signWords), color: pick(rng, PALETTE.neon), vertical: rng() < 0.5 });
  }
  for (const rx of ROADS_X) for (let y = 120; y < HARBOR_Y; y += 200) lamps.push({ x: rx + CFG.ROAD_W / 2 + 6, y });
  for (const ry of ROADS_Y) for (let x = 120; x < CFG.WORLD_W; x += 200) lamps.push({ x, y: ry + CFG.ROAD_W / 2 + 6 });

  function makeCar(type, x, y, angle) {
    const t = CAR_TYPES[type];
    return { type, x, y, angle, speed: 0, w: t.w, h: t.h, color: t.color, health: 100, wrecked: false, traffic: false, axis: null, dir: 1, lane: 0, police: type === 'police', siren: 0, smoke: 0 };
  }
  const cars = [];
  // Parked cars along road edges.
  const parkedTypes = ['sedan', 'sedan', 'taxi', 'van', 'sport', 'sedan'];
  for (let i = 0; i < 26; i++) {
    const rx = pick(rng, ROADS_X), ry = pick(rng, ROADS_Y);
    const horiz = rng() < 0.5;
    cars.push(makeCar(pick(rng, parkedTypes),
      horiz ? rx + range(rng, -150, 150) : rx + (rng() < 0.5 ? -1 : 1) * (CFG.ROAD_W / 2 - 16),
      horiz ? ry + (rng() < 0.5 ? -1 : 1) * (CFG.ROAD_W / 2 - 16) : ry + range(rng, -150, 150),
      horiz ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2)));
  }
  // Traffic cars on the lanes.
  for (let i = 0; i < 22; i++) {
    const c = makeCar(pick(rng, ['sedan', 'taxi', 'van', 'sedan', 'sport']),
      0, 0, 0);
    c.traffic = true;
    if (rng() < 0.5) {
      c.axis = 'v'; const rx = pick(rng, ROADS_X); c.dir = rng() < 0.5 ? 1 : -1;
      c.lane = c.dir === 1 ? 22 : -22; c.x = rx + c.lane; c.y = range(rng, 100, HARBOR_Y - 100); c.angle = c.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      c.axis = 'h'; const ry = pick(rng, ROADS_Y); c.dir = rng() < 0.5 ? 1 : -1;
      c.lane = c.dir === 1 ? 22 : -22; c.y = ry + c.lane; c.x = range(rng, 100, CFG.WORLD_W - 100); c.angle = c.dir === 1 ? 0 : Math.PI;
    }
    c.speed = range(rng, 110, 170);
    cars.push(c);
  }
  // The hero sports car, parked near the start, for the cover shot and the player.
  const heroCar = makeCar('sport', 700, 660, 0);
  cars.push(heroCar);

  const peds = [];
  const pedColors = ['#e8c07a', '#7ab8e8', '#e87ab0', '#9ae87a', '#d8d8d8', '#e8a25a'];
  for (let i = 0; i < 42; i++) {
    const rx = pick(rng, ROADS_X), ry = pick(rng, ROADS_Y);
    peds.push({
      x: clamp(rx + range(rng, -260, 260), 60, CFG.WORLD_W - 60),
      y: clamp(ry + range(rng, -260, 260), 60, HARBOR_Y - 60),
      angle: rng() * Math.PI * 2, speed: range(rng, 28, 55), color: pick(rng, pedColors),
      flee: 0, down: false, downT: 0, walkPhase: rng() * 6,
    });
  }
  const pickups = [];
  for (let i = 0; i < 10; i++) pickups.push({ kind: i % 3 === 0 ? 'health' : i % 3 === 1 ? 'ammo' : 'cash', x: range(rng, 200, 3000), y: range(rng, 200, 2000), taken: false });
  pickups.push({ kind: 'health', x: 760, y: 700, taken: false });

  const state = {
    seed, buildings, parks, signs, lamps, trees, cars, peds, pickups, heroCar,
    player: { x: 640, y: 700, angle: -Math.PI / 2, health: 100, ammo: 24, cash: CFG.START_CASH, inCar: null, speed: 0, invuln: 0 },
    wanted: 0, heatTimer: 0, decayTimer: 0, quietTimer: 0,
    clockMin: 19 * 60 + 42, // 19:42 dusk
    missionIndex: 0, missionDone: false, missionMsg: '', banner: '', bannerT: 0,
    bullets: [], particles: [], skids: [], shake: 0, time: 0,
    stats: { crimes: 0, carsStolen: 0, missionsDone: 0 },
    gameOver: null, // 'wasted' | 'busted'
    cops: [], // foot cops
  };

  function addWanted(n) {
    state.wanted = clamp(state.wanted + n, 0, CFG.MAX_WANTED);
    state.quietTimer = 0; state.decayTimer = 0;
    if (n > 0) state.stats.crimes += 1;
  }
  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, s = range(rng, speed * 0.3, speed);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: range(rng, 0.3, 0.9), max: 0.9, color, size: range(rng, 2, 5), smoke: false });
    }
  }
  function smoke(x, y, n) {
    for (let i = 0; i < n; i++) state.particles.push({ x: x + range(rng, -8, 8), y: y + range(rng, -8, 8), vx: range(rng, -12, 12), vy: range(rng, -30, -8), life: range(rng, 0.8, 1.6), max: 1.6, color: '#555', size: range(rng, 6, 12), smoke: true });
  }
  function explode(car) {
    car.wrecked = true; car.health = 0; car.speed = 0;
    burst(car.x, car.y, '#ff9d00', 26, 260); burst(car.x, car.y, '#ff2e2e', 18, 200); smoke(car.x, car.y, 14);
    state.shake = Math.max(state.shake, 10);
  }
  function collideBuildings(o, r) {
    for (const b of buildings) {
      const nx = clamp(o.x, b.x, b.x + b.w), ny = clamp(o.y, b.y, b.y + b.h);
      const dx = o.x - nx, dy = o.y - ny, d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.01;
        o.x = nx + (dx / d) * r; o.y = ny + (dy / d) * r;
        return { nx: dx / d, ny: dy / d };
      }
    }
    return null;
  }
  function nearestCar(x, y, maxD) {
    let best = null, bd = maxD;
    for (const c of cars) { if (c.wrecked) continue; const d = dist(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  function step(dt, ctl, audio) {
    state.time += dt;
    state.clockMin = (state.clockMin + dt * 0.6) % (24 * 60);
    if (state.bannerT > 0) state.bannerT -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    const p = state.player;
    if (p.invuln > 0) p.invuln -= dt;

    // ---- wanted decay: quiet + unseen = heat cools off
    if (state.wanted > 0) {
      state.quietTimer += dt;
      const nearCop = state.cars.some((c) => c.police && !c.wrecked && dist(c.x, c.y, p.x, p.y) < 420);
      if (state.quietTimer > 10 && !nearCop) {
        state.decayTimer += dt;
        if (state.decayTimer > 7) { state.wanted -= 1; state.decayTimer = 0; state.quietTimer = 0; }
      }
    }
    // ---- police spawner: cruisers + foot cops scale with stars
    const wantCruisers = state.wanted >= 1 ? Math.min(1 + state.wanted, 5) : 0;
    const liveCruisers = state.cars.filter((c) => c.police && !c.wrecked).length;
    if (liveCruisers < wantCruisers) {
      const c = makeCar('police', clamp(p.x + (rng() < 0.5 ? -520 : 520), 100, CFG.WORLD_W - 100), clamp(p.y + (rng() < 0.5 ? -380 : 380), 100, HARBOR_Y - 100), 0);
      c.police = true; state.cars.push(c);
    }
    if (state.wanted >= 2 && state.cops.length < state.wanted - 1) {
      state.cops.push({ x: clamp(p.x + range(rng, -300, 300), 60, CFG.WORLD_W - 60), y: clamp(p.y + range(rng, -300, 300), 60, HARBOR_Y - 60), angle: 0, speed: 150, health: 50 });
    }

    // ---- entering / exiting cars
    if (ctl.enter) {
      if (p.inCar) {
        const car = p.inCar; p.inCar = null;
        p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
        car.speed = 0;
      } else {
        const car = nearestCar(p.x, p.y, 64);
        if (car) {
          p.inCar = car; car.traffic = false;
          if (car.police) addWanted(2); else { addWanted(1); state.stats.carsStolen += 1; }
          state.banner = 'Car taken — the heat is on'; state.bannerT = 2.2;
        }
      }
    }

    // ---- player movement
    if (p.inCar) {
      const car = p.inCar;
      const max = CFG.CAR_MAX[car.type] || 340;
      // Explicit drive model: accelerate, brake / reverse, coast drag.
      if (ctl.up) car.speed = Math.min(max, car.speed + CFG.CAR_ACCEL * dt);
      else if (ctl.down) car.speed = car.speed > 10 ? Math.max(0, car.speed - CFG.CAR_BRAKE * dt) : Math.max(-CFG.CAR_REVERSE, car.speed - CFG.CAR_ACCEL * 0.5 * dt);
      else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 240 * dt);
      const steer = (ctl.left ? -1 : 0) + (ctl.right ? 1 : 0);
      const spd = Math.abs(car.speed) / max;
      car.angle += steer * 2.6 * spd * dt * (car.speed < 0 ? -1 : 1);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const hit = collideBuildings({ x: nx, y: ny }, 24);
      if (hit) {
        if (Math.abs(car.speed) > 130) { car.health -= Math.abs(car.speed) * 0.12; state.shake = Math.max(state.shake, 6); if (audio) audio.crash(); burst(car.x, car.y, '#ffd34d', 8, 140); }
        car.speed *= -0.25; car.x += hit.nx * 4; car.y += hit.ny * 4;
      } else { car.x = nx; car.y = ny; }
      car.x = clamp(car.x, 40, CFG.WORLD_W - 40); car.y = clamp(car.y, 40, CFG.WORLD_H - 40);
      if (Math.abs(car.speed) > 200 && steer !== 0) {
        state.skids.push({ x: car.x - Math.cos(car.angle) * 18, y: car.y - Math.sin(car.angle) * 18, angle: car.angle, life: 5 });
        if (state.skids.length > 220) state.skids.shift();
      }
      p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
      if (audio) audio.engine(Math.abs(car.speed) / max);
      // run over pedestrians
      for (const ped of peds) {
        if (!ped.down && dist(ped.x, ped.y, car.x, car.y) < 26 && Math.abs(car.speed) > 120) {
          ped.down = true; ped.downT = 6; addWanted(1); burst(ped.x, ped.y, '#ff5555', 10, 120);
          state.banner = 'Pedestrian down — witnesses called it in'; state.bannerT = 2;
        }
      }
      if (car.health <= 0 && !car.wrecked) { explode(car); p.inCar = null; p.health -= 20; p.x = car.x + 40; p.y = car.y + 30; }
      if (car.health < 45 && rng() < dt * 6) smoke(car.x, car.y, 1);
    } else {
      if (audio) audio.engineOff();
      const sp = ctl.sprint ? CFG.SPRINT : CFG.PLAYER_SPEED;
      let mx = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0), my = (ctl.down ? 1 : 0) - (ctl.up ? 1 : 0);
      const ml = Math.hypot(mx, my);
      if (ml > 0) { mx /= ml; my /= ml; p.x += mx * sp * dt; p.y += my * sp * dt; p.speed = sp; }
      else p.speed = 0;
      p.x = clamp(p.x, 30, CFG.WORLD_W - 30); p.y = clamp(p.y, 30, CFG.WORLD_H - 30);
      collideBuildings(p, 13);
      p.angle = ctl.aimAngle;
      // shooting
      if ((ctl.shoot || ctl.fireHeld) && p.ammo > 0 && state.time - (state._lastShot || 0) > 0.22) {
        state._lastShot = state.time;
        p.ammo -= 1;
        const a = p.angle;
        state.bullets.push({ x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, life: 0.55 });
        burst(p.x + Math.cos(a) * 24, p.y + Math.sin(a) * 24, '#ffe27a', 4, 120);
        if (audio) audio.shot();
        addWanted(0); // firing in public draws attention only when it hits / is seen
        for (const ped of peds) if (!ped.down && dist(ped.x, ped.y, p.x, p.y) < 260) ped.flee = 2.5;
      }
      // pickups
      for (const pk of pickups) {
        if (!pk.taken && dist(pk.x, pk.y, p.x, p.y) < 26) {
          pk.taken = true;
          if (pk.kind === 'health') p.health = Math.min(100, p.health + 40);
          else if (pk.kind === 'ammo') p.ammo += 18;
          else p.cash += 60;
          if (audio) audio.pickup();
        }
      }
    }

    // ---- bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let dead = b.life <= 0;
      if (!dead) {
        for (const car of state.cars) {
          if (car.wrecked || car === p.inCar) continue;
          if (dist(b.x, b.y, car.x, car.y) < 26) {
            car.health -= 34; burst(b.x, b.y, '#ffd34d', 6, 130); dead = true;
            if (car.police) addWanted(1);
            if (car.health <= 0) explode(car);
            break;
          }
        }
      }
      if (!dead) for (const ped of peds) {
        if (!ped.down && dist(b.x, b.y, ped.x, ped.y) < 12) {
          ped.down = true; ped.downT = 8; burst(ped.x, ped.y, '#ff5555', 10, 120); dead = true; addWanted(1);
          break;
        }
      }
      if (!dead) for (const cop of state.cops) {
        if (dist(b.x, b.y, cop.x, cop.y) < 12) { cop.health -= 50; dead = true; addWanted(1); if (cop.health <= 0) cop.dead = true; break; }
      }
      if (dead) state.bullets.splice(i, 1);
    }
    state.cops = state.cops.filter((c) => !c.dead);

    // ---- traffic
    for (const car of state.cars) {
      if (!car.traffic || car.wrecked) continue;
      // slow for a car ahead on the same lane
      let slow = false;
      for (const o of state.cars) {
        if (o === car || o.wrecked) continue;
        const d = dist(car.x, car.y, o.x, o.y);
        if (d < 70) {
          const ahead = Math.cos(car.angle) * (o.x - car.x) + Math.sin(car.angle) * (o.y - car.y);
          if (ahead > 0 && Math.abs(Math.sin(car.angle) * (o.x - car.x) - Math.cos(car.angle) * (o.y - car.y)) < 26) { slow = true; break; }
        }
      }
      if (!slow) car.speed = Math.min(car.speed + 30 * dt, 150);
      else car.speed = Math.max(0, car.speed - 200 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.x < -60) car.x = CFG.WORLD_W + 40; if (car.x > CFG.WORLD_W + 60) car.x = -40;
      if (car.y < -60) car.y = HARBOR_Y + 40; if (car.y > HARBOR_Y + 60) car.y = -40;
    }
    // ---- police cruisers chase
    for (const car of state.cars) {
      if (!car.police || car.wrecked || car === p.inCar) continue;
      car.siren += dt;
      const target = Math.atan2(p.y - car.y, p.x - car.x);
      const diff = angDiff(target, car.angle);
      const maxSpd = 300 + state.wanted * 28;
      car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      car.speed = lerp(car.speed, maxSpd, dt * 0.8);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!collideBuildings({ x: nx, y: ny }, 24)) { car.x = nx; car.y = ny; }
      else { car.angle += 0.9 * dt * 10; car.speed *= 0.6; }
      car.x = clamp(car.x, 40, CFG.WORLD_W - 40); car.y = clamp(car.y, 40, CFG.WORLD_H - 40);
      if (dist(car.x, car.y, p.x, p.y) < 34) {
        if (p.inCar) { p.inCar.health -= 26 * dt; if (p.inCar.health <= 0) explode(p.inCar); }
        else if (p.invuln <= 0) { p.health -= 22 * dt; p.invuln = 0.4; }
        state.shake = Math.max(state.shake, 4);
      }
    }
    // ---- foot cops chase
    for (const cop of state.cops) {
      const a = Math.atan2(p.y - cop.y, p.x - cop.x);
      cop.angle = a;
      cop.x += Math.cos(a) * cop.speed * dt; cop.y += Math.sin(a) * cop.speed * dt;
      if (dist(cop.x, cop.y, p.x, p.y) < 22 && p.invuln <= 0 && !p.inCar) {
        p.health -= 18; p.invuln = 0.8; addWanted(0);
        state.banner = 'BUSTED by Harbor PD'; state.bannerT = 2;
        if (p.health <= 0) state.gameOver = 'busted';
      }
    }
    // ---- pedestrians
    for (const ped of peds) {
      if (ped.down) { ped.downT -= dt; if (ped.downT <= 0) { ped.down = false; } continue; }
      ped.walkPhase += dt * 6;
      let sp = ped.speed;
      if (ped.flee > 0) {
        ped.flee -= dt; sp = 150;
        const a = Math.atan2(ped.y - p.y, ped.x - p.x);
        ped.angle = a;
      } else if (rng() < dt * 0.25) {
        // wander: prefer sidewalk directions along roads
        ped.angle = Math.floor(rng() * 4) * (Math.PI / 2);
      }
      ped.x += Math.cos(ped.angle) * sp * dt;
      ped.y += Math.sin(ped.angle) * sp * dt;
      ped.x = clamp(ped.x, 40, CFG.WORLD_W - 40); ped.y = clamp(ped.y, 40, HARBOR_Y - 40);
      if (isRoad(ped.x, ped.y) && ped.flee <= 0) ped.angle += Math.PI / 2; // step off the road
    }
    // ---- particles / skids
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.skids.length - 1; i >= 0; i--) { state.skids[i].life -= dt; if (state.skids[i].life <= 0) state.skids.splice(i, 1); }

    // ---- missions
    const m = MISSIONS[state.missionIndex];
    if (m && !state.missionDone) {
      if (state.missionIndex === 0) {
        state.missionMsg = m.objective;
        if (dist(p.x, p.y, MARKERS.pickup.x, MARKERS.pickup.y) < 46) completeMission();
      } else if (state.missionIndex === 1) {
        state.missionMsg = state.wanted > 0 ? 'Lose the heat — stay out of sight of the police.' : 'Heat is off. Get to the safehouse.';
        if (state.wanted === 0 && dist(p.x, p.y, MARKERS.safehouse.x, MARKERS.safehouse.y) < 50) completeMission();
      } else if (state.missionIndex === 2) {
        state.missionMsg = m.objective;
        if (dist(p.x, p.y, MARKERS.pier.x, MARKERS.pier.y) < 50) completeMission();
      }
    } else if (state.missionDone) {
      state.missionMsg = 'All jobs done for Madame Voss. The harbor is yours — free roam.';
    }
    function completeMission() {
      p.cash += m.reward; state.stats.missionsDone += 1;
      state.banner = `MISSION COMPLETE — $${m.reward}`; state.bannerT = 3;
      if (audio) audio.pickup();
      state.missionIndex += 1;
      if (state.missionIndex === 1) { addWanted(3); state.banner = 'MISSION COMPLETE — $500 · Detective Kline is on you!'; }
      if (state.missionIndex === 2) { addWanted(2); }
      if (state.missionIndex >= MISSIONS.length) state.missionDone = true;
    }

    // ---- health / death
    if (p.health <= 0 && !state.gameOver) state.gameOver = 'wasted';
    if (p.health <= 0) p.health = 0;
  }

  function reset() {
    // fresh state by rebuilding is simplest: re-create via createWorld is handled by caller.
  }
  return { state, step, addWanted, nearestCar, explode, burst };
}
