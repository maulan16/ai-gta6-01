// NEON HARBOR — render.js : drawing only. Canvas 2D, dusk/neon palette, top-down camera.
import { CFG, CAR_TYPES, MISSIONS, PALETTE, FONT } from './config.js';
import { ROADS_X, ROADS_Y, HARBOR_Y, MARKERS } from './world.js';
import { clamp, mulberry32 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd21f' : 'rgba(255,255,255,0.18)';
  ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = CFG.VIEW_W; canvas.height = CFG.VIEW_H;
  const fonts = new Map();
  function text(v, x, y, size, color, align, weight) {
    const key = size + (weight || '');
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    ctx.font = fonts.get(key); ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(v, x, y);
  }
  function camOf(state) {
    const p = state.player;
    let cx = clamp(p.x - CFG.VIEW_W / 2, 0, CFG.WORLD_W - CFG.VIEW_W);
    let cy = clamp(p.y - CFG.VIEW_H / 2, 0, CFG.WORLD_H - CFG.VIEW_H);
    if (state.shake > 0) { cx += (Math.random() - 0.5) * state.shake; cy += (Math.random() - 0.5) * state.shake; }
    return { x: cx, y: cy };
  }

  function drawCity(state, cam) {
    const x0 = cam.x - 60, y0 = cam.y - 60, x1 = cam.x + CFG.VIEW_W + 60, y1 = cam.y + CFG.VIEW_H + 60;
    // ground
    ctx.fillStyle = '#171722'; ctx.fillRect(cam.x - 20, cam.y - 20, CFG.VIEW_W + 40, CFG.VIEW_H + 40);
    // parks + grass
    for (const pk of state.parks) {
      if (pk.x > x1 || pk.x + pk.w < x0 || pk.y > y1 || pk.y + pk.h < y0) continue;
      ctx.fillStyle = PALETTE.grass; ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(pk.x + 8, pk.y + 8, pk.w - 16, 10);
    }
    // water / harbor
    ctx.fillStyle = PALETTE.water; ctx.fillRect(Math.max(x0, 0), Math.max(y0, HARBOR_Y), Math.min(x1, CFG.WORLD_W) - Math.max(x0, 0), Math.min(y1, CFG.WORLD_H) - Math.max(y0, HARBOR_Y));
    ctx.fillStyle = PALETTE.water2;
    for (let y = HARBOR_Y + 26; y < CFG.WORLD_H && y < y1; y += 52) {
      if (y < y0) continue;
      ctx.fillRect(Math.max(x0, 0), y, Math.min(x1, CFG.WORLD_W) - Math.max(x0, 0), 3);
    }
    // piers
    ctx.fillStyle = '#4a3826';
    for (const px of [900, 1300, 1640, 2000, 2400]) ctx.fillRect(px - 26, HARBOR_Y, 52, 150);
    ctx.fillStyle = '#6b543a';
    for (const px of [900, 1300, 1640, 2000, 2400]) ctx.fillRect(px - 26, HARBOR_Y, 52, 8);
    // sidewalks + roads
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of ROADS_X) ctx.fillRect(rx - CFG.ROAD_W / 2 - 10, Math.max(y0, 0), CFG.ROAD_W + 20, Math.min(y1, HARBOR_Y) - Math.max(y0, 0));
    for (const ry of ROADS_Y) ctx.fillRect(Math.max(x0, 0), ry - CFG.ROAD_W / 2 - 10, Math.min(x1, CFG.WORLD_W) - Math.max(x0, 0), CFG.ROAD_W + 20);
    ctx.fillStyle = PALETTE.asphalt;
    for (const rx of ROADS_X) ctx.fillRect(rx - CFG.ROAD_W / 2, Math.max(y0, 0), CFG.ROAD_W, Math.min(y1, HARBOR_Y) - Math.max(y0, 0));
    for (const ry of ROADS_Y) ctx.fillRect(Math.max(x0, 0), ry - CFG.ROAD_W / 2, Math.min(x1, CFG.WORLD_W) - Math.max(x0, 0), CFG.ROAD_W);
    // centre dashes
    ctx.fillStyle = PALETTE.roadLine;
    for (const rx of ROADS_X) for (let y = Math.max(0, Math.floor(y0 / 44) * 44); y < Math.min(y1, HARBOR_Y); y += 44) ctx.fillRect(rx - 2, y, 4, 22);
    for (const ry of ROADS_Y) for (let x = Math.max(0, Math.floor(x0 / 44) * 44); x < Math.min(x1, CFG.WORLD_W); x += 44) ctx.fillRect(x, ry - 2, 22, 4);
    // trees
    for (const t of state.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      ctx.fillStyle = '#1d4d2a'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2f7a3d'; ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    // buildings with lit windows + neon trim
    for (const b of state.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(b.x, b.y, b.w, 6);
      // rooftop detail
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, b.w * 0.3, b.h * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(b.x + b.w * 0.6, b.y + b.h * 0.6, b.w * 0.2, b.h * 0.2);
      if (b.tall) { ctx.fillStyle = b.color; ctx.fillRect(b.x + b.w * 0.3, b.y - 10, b.w * 0.4, 12); }
      // lit windows (deterministic per building)
      const wr = mulberry32(b.winSeed);
      const cols = Math.max(2, Math.floor(b.w / 22)), rows = Math.max(2, Math.floor(b.h / 24));
      for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
        if (wr() < 0.42) {
          ctx.fillStyle = wr() < 0.7 ? '#ffd97a' : '#7ad7ff';
          ctx.globalAlpha = 0.75;
          ctx.fillRect(b.x + 7 + cx * ((b.w - 14) / cols), b.y + 8 + cy * ((b.h - 14) / rows), 9, 11);
          ctx.globalAlpha = 1;
        }
      }
      if (b.neon) {
        ctx.strokeStyle = b.neon; ctx.lineWidth = 2.5;
        ctx.shadowColor = b.neon; ctx.shadowBlur = 12;
        ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
        ctx.shadowBlur = 0;
      }
    }
    // neon signs
    for (const s of state.signs) {
      if (s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1) continue;
      ctx.save(); ctx.translate(s.x, s.y); if (s.vertical) ctx.rotate(Math.PI / 2);
      ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = s.color; ctx.shadowBlur = 14; ctx.fillStyle = s.color;
      ctx.fillText(s.text, 0, 0);
      ctx.shadowBlur = 0; ctx.restore();
    }
    // street lamps + light pools
    for (const l of state.lamps) {
      if (l.x < x0 || l.x > x1 || l.y < y0 || l.y > y1) continue;
      ctx.fillStyle = 'rgba(255, 214, 130, 0.10)'; ctx.beginPath(); ctx.arc(l.x, l.y, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // skid marks
    ctx.strokeStyle = 'rgba(10,10,14,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const s of state.skids) {
      ctx.globalAlpha = clamp(s.life / 5, 0, 0.7);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(s.angle) * 16, s.y - Math.sin(s.angle) * 16); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // mission marker (world)
    const mk = currentMarker(state);
    if (mk) {
      const pulse = 1 + Math.sin(state.time * 4) * 0.12;
      ctx.save(); ctx.translate(mk.x, mk.y);
      ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 3; ctx.shadowColor = '#ffea00'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffea00'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffea00';
      ctx.fillText(mk.label, 0, -36);
      // beacon column
      ctx.fillStyle = 'rgba(255,234,0,0.13)'; ctx.fillRect(-14, -260, 28, 260);
      ctx.restore();
    }
    // pickups
    for (const pk of state.pickups) {
      if (pk.taken || pk.x < x0 || pk.x > x1 || pk.y < y0 || pk.y > y1) continue;
      ctx.save(); ctx.translate(pk.x, pk.y);
      if (pk.kind === 'health') { ctx.fillStyle = '#fff'; ctx.fillRect(-9, -9, 18, 18); ctx.fillStyle = '#e5383b'; ctx.fillRect(-2.5, -7, 5, 14); ctx.fillRect(-7, -2.5, 14, 5); }
      else if (pk.kind === 'ammo') { ctx.fillStyle = '#ffd21f'; ctx.fillRect(-8, -5, 16, 10); ctx.fillStyle = '#111'; ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AMMO', 0, 0.5); }
      else { ctx.fillStyle = '#37d67a'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#062'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 0.5); }
      ctx.restore();
    }
  }

  function drawCar(state, car) {
    const t = CAR_TYPES[car.type];
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(ctx, -t.w / 2 + 3, -t.h / 2 + 4, t.w, t.h, 8); ctx.fill();
    const body = car.wrecked ? '#1a1a1a' : car.color;
    ctx.fillStyle = body; rr(ctx, -t.w / 2, -t.h / 2, t.w, t.h, 8); ctx.fill();
    ctx.fillStyle = car.wrecked ? '#222' : 'rgba(20,24,40,0.85)';
    rr(ctx, -t.w * 0.22, -t.h / 2 + 3, t.w * 0.42, t.h - 6, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(ctx, -t.w * 0.22, -t.h / 2 + 3, t.w * 0.14, t.h - 6, 4); ctx.fill();
    if (car.type === 'police' && !car.wrecked) {
      ctx.fillStyle = '#fff'; rr(ctx, -t.w * 0.28, -t.h / 2 + 2, t.w * 0.5, t.h - 4, 4); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PD', 0, 0);
      const flash = Math.floor(state.time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff2e2e' : '#2e7dff';
      ctx.beginPath(); ctx.arc(-4, -t.h / 2 - 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? '#2e7dff' : '#ff2e2e';
      ctx.beginPath(); ctx.arc(5, -t.h / 2 - 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = flash ? '#ff2e2e' : '#2e7dff';
      ctx.beginPath(); ctx.arc(0, -t.h / 2, 26, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (car.type === 'taxi') { ctx.fillStyle = '#111'; ctx.fillRect(-6, -t.h / 2 - 5, 14, 5); ctx.fillStyle = '#ffe27a'; ctx.font = `bold 6px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('TAXI', 1, -t.h / 2 - 1); }
    // headlights + taillights
    ctx.fillStyle = '#fff6c9';
    ctx.fillRect(t.w / 2 - 2, -t.h / 2 + 3, 3, 4); ctx.fillRect(t.w / 2 - 2, t.h / 2 - 7, 3, 4);
    ctx.fillStyle = '#ff2e2e';
    ctx.fillRect(-t.w / 2 - 1, -t.h / 2 + 3, 3, 4); ctx.fillRect(-t.w / 2 - 1, t.h / 2 - 7, 3, 4);
    if (!car.wrecked && Math.abs(car.speed) > 20) {
      ctx.fillStyle = 'rgba(255,246,201,0.10)';
      ctx.beginPath(); ctx.moveTo(t.w / 2, -6); ctx.lineTo(t.w / 2 + 52, -16); ctx.lineTo(t.w / 2 + 52, 16); ctx.lineTo(t.w / 2, 6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawPed(ctx2, ped) {
    ctx2.save(); ctx2.translate(ped.x, ped.y);
    if (ped.down) { ctx2.rotate(ped.angle); ctx2.fillStyle = ped.color; rr(ctx2, -11, -5, 22, 10, 5); ctx2.fill(); ctx2.restore(); return; }
    ctx2.fillStyle = 'rgba(0,0,0,0.35)'; ctx2.beginPath(); ctx2.ellipse(0, 4, 8, 5, 0, 0, Math.PI * 2); ctx2.fill();
    const bob = Math.sin(ped.walkPhase) * 1.5;
    ctx2.fillStyle = ped.color; ctx2.beginPath(); ctx2.arc(0, bob * 0.3, 8.5, 0, Math.PI * 2); ctx2.fill();
    ctx2.fillStyle = '#e8b98a'; ctx2.beginPath(); ctx2.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 + bob * 0.3, 5, 0, Math.PI * 2); ctx2.fill();
    ctx2.restore();
  }

  function drawPlayer(state) {
    const p = state.player;
    if (p.inCar) return;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 5, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    const bob = p.speed > 0 ? Math.sin(state.time * 14) * 1.5 : 0;
    ctx.rotate(p.angle);
    // pistol
    ctx.fillStyle = '#222'; ctx.fillRect(8, -2, 14, 4);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, bob * 0.3, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.arc(0, bob * 0.3, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1c26'; ctx.beginPath(); ctx.arc(2.5, bob * 0.3, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // aim line (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
    ctx.lineTo(p.x + Math.cos(p.angle) * 46, p.y + Math.sin(p.angle) * 46); ctx.stroke();
  }

  function drawMinimap(state) {
    const mw = 218, mh = 162, mx = 16, my = CFG.VIEW_H - mh - 16;
    const sx = mw / CFG.WORLD_W, sy = mh / CFG.WORLD_H;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,0.82)'; rr(ctx, mx - 4, my - 4, mw + 8, mh + 8, 8); ctx.fill();
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5; ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    ctx.fillStyle = '#0a2a44'; ctx.fillRect(mx, my + HARBOR_Y * sy, mw, mh - HARBOR_Y * sy);
    ctx.fillStyle = '#23232e';
    for (const rx of ROADS_X) ctx.fillRect(mx + rx * sx - 2, my, 4, mh);
    for (const ry of ROADS_Y) ctx.fillRect(mx, my + ry * sy - 2, mw, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (const b of state.buildings) ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(1.5, b.w * sx), Math.max(1.5, b.h * sy));
    const mk = currentMarker(state);
    if (mk) {
      ctx.fillStyle = '#ffea00';
      const px = mx + mk.x * sx, py = my + mk.y * sy;
      ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 6); ctx.lineTo(px - 5, py); ctx.closePath(); ctx.fill();
    }
    // police blips
    for (const c of state.cars) if (c.police && !c.wrecked) {
      ctx.fillStyle = Math.floor(state.time * 4) % 2 === 0 ? '#ff2e2e' : '#2e7dff';
      ctx.beginPath(); ctx.arc(mx + c.x * sx, my + c.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // player arrow
    const p = state.player;
    ctx.save(); ctx.translate(mx + p.x * sx, my + p.y * sy); ctx.rotate(p.angle);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    text('NEON HARBOR', mx + 2, my - 8, 11, '#00e5ff', 'left', 'bold');
  }

  function drawHud(state) {
    const p = state.player;
    // top-left: cash / health / ammo
    ctx.fillStyle = 'rgba(8,10,18,0.72)'; rr(ctx, 12, 12, 250, 84, 8); ctx.fill();
    text(`$${p.cash.toLocaleString('en-US')}`, 26, 42, 26, '#37d67a', 'left', 'bold');
    text('CASH', 196, 38, 11, '#9aa', 'left', 'bold');
    // health bar
    ctx.fillStyle = '#222'; rr(ctx, 26, 54, 150, 12, 6); ctx.fill();
    ctx.fillStyle = p.health > 30 ? '#37d67a' : '#ff2e2e'; rr(ctx, 26, 54, 150 * clamp(p.health / 100, 0, 1), 12, 6); ctx.fill();
    text('HP', 182, 65, 11, '#fff', 'left', 'bold');
    text(`AMMO ${p.ammo}`, 26, 86, 13, '#ffd21f', 'left', 'bold');
    text('JACE ROOK', 196, 86, 11, '#ff2e88', 'left', 'bold');
    // wanted stars top-right
    ctx.fillStyle = 'rgba(8,10,18,0.72)'; rr(ctx, CFG.VIEW_W - 218, 12, 206, 46, 8); ctx.fill();
    for (let i = 0; i < 5; i++) star(ctx, CFG.VIEW_W - 190 + i * 36, 36, 13, i < state.wanted);
    text('WANTED', CFG.VIEW_W - 24, 34, 11, '#ffb3c8', 'right', 'bold');
    // mission objective top-center
    const m = MISSIONS[state.missionIndex];
    ctx.fillStyle = 'rgba(8,10,18,0.72)';
    const obj = state.missionDone ? 'FREE ROAM — the harbor is yours' : (m ? `${m.title}  ·  ${state.missionMsg}` : '');
    ctx.font = `bold 14px ${FONT}`;
    const w = Math.min(860, ctx.measureText(obj).width + 36);
    rr(ctx, (CFG.VIEW_W - w) / 2, 12, w, 34, 8); ctx.fill();
    ctx.fillStyle = '#ffea00'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(obj, CFG.VIEW_W / 2, 30);
    // clock + speed bottom-right
    const hh = Math.floor(state.clockMin / 60), mm = Math.floor(state.clockMin % 60);
    const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    text(clock, CFG.VIEW_W - 24, CFG.VIEW_H - 18, 20, '#fff', 'right', 'bold');
    if (p.inCar) {
      const mph = Math.round(Math.abs(p.inCar.speed) * 0.14);
      text(`${mph}`, CFG.VIEW_W - 24, CFG.VIEW_H - 52, 34, '#fff', 'right', 'bold');
      text('MPH', CFG.VIEW_W - 24, CFG.VIEW_H - 84, 12, '#9aa', 'right', 'bold');
      text(CAR_TYPES[p.inCar.type].name, CFG.VIEW_W - 24, CFG.VIEW_H - 104, 12, '#00e5ff', 'right', 'bold');
    }
    // help line
    text('WASD drive / walk · E enter car · Click / F shoot · Shift sprint · M mute · Esc pause', CFG.VIEW_W / 2, CFG.VIEW_H - 8, 12, 'rgba(255,255,255,0.55)', 'center');
    // banner
    if (state.bannerT > 0) {
      ctx.globalAlpha = clamp(state.bannerT, 0, 1);
      ctx.font = `bold 30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
      ctx.fillText(state.banner, CFG.VIEW_W / 2, 120);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    drawMinimap(state);
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(6,8,16,0.72)'; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    ctx.fillStyle = 'rgba(12,14,26,0.95)'; rr(ctx, 290, 150, 700, 420, 14); ctx.fill();
    ctx.strokeStyle = accent || '#ff2e88'; ctx.lineWidth = 2; ctx.shadowColor = accent || '#ff2e88'; ctx.shadowBlur = 16;
    rr(ctx, 290, 150, 700, 420, 14); ctx.stroke(); ctx.shadowBlur = 0;
    text(title, CFG.VIEW_W / 2, 225, 44, accent || '#ff2e88', 'center', 'bold');
    lines.forEach((ln, i) => text(ln, CFG.VIEW_W / 2, 285 + i * 30, 17, '#dfe6f2', 'center'));
    text(prompt, CFG.VIEW_W / 2, 530, 18, '#ffea00', 'center', 'bold');
  }

  function draw(state, screen, save) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // dusk sky gradient backdrop
    const g = ctx.createLinearGradient(0, 0, 0, CFG.VIEW_H);
    g.addColorStop(0, '#1a1030'); g.addColorStop(0.55, '#241533'); g.addColorStop(1, '#0d0d18');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    const cam = camOf(state);
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    drawCity(state, cam);
    for (const car of state.cars) {
      if (car.x < cam.x - 80 || car.x > cam.x + CFG.VIEW_W + 80 || car.y < cam.y - 80 || car.y > cam.y + CFG.VIEW_H + 80) continue;
      drawCar(state, car);
    }
    for (const ped of state.peds) {
      if (ped.x < cam.x - 40 || ped.x > cam.x + CFG.VIEW_W + 40 || ped.y < cam.y - 40 || ped.y > cam.y + CFG.VIEW_H + 40) continue;
      drawPed(ctx, ped);
    }
    for (const cop of state.cops) {
      ctx.save(); ctx.translate(cop.x, cop.y); ctx.rotate(cop.angle);
      ctx.fillStyle = '#1c2f6e'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd21f'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PD', 0, 0);
      ctx.restore();
    }
    // bullets
    ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2.5;
    for (const b of state.bullets) {
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // particles
    for (const pt of state.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1) * (pt.smoke ? 0.5 : 1);
      ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // world arrow to mission marker
    const mk = currentMarker(state);
    if (mk && screen === SCREEN_PLAY) {
      const p = state.player, d = Math.hypot(mk.x - p.x, mk.y - p.y);
      if (d > 320) {
        const a = Math.atan2(mk.y - p.y, mk.x - p.x);
        const ax = p.x + Math.cos(a) * 90, ay = p.y + Math.sin(a) * 90;
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
        ctx.fillStyle = '#ffea00'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffea00';
        ctx.fillText(`${Math.round(d)}m`, ax, ay - 16);
      }
    }
    drawPlayer(state);
    ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(640, 360, 320, 640, 360, 780);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(6,8,18,0.66)'; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold 84px ${FONT}`;
      ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 34; ctx.fillStyle = '#ff2e88';
      ctx.fillText('NEON', CFG.VIEW_W / 2, 170);
      ctx.shadowColor = '#00e5ff'; ctx.fillStyle = '#00e5ff';
      ctx.fillText('HARBOR', CFG.VIEW_W / 2, 252);
      ctx.shadowBlur = 0;
      text('An open-world crime story. Original city. Original crew. No mercy after dark.', CFG.VIEW_W / 2, 320, 17, '#dfe6f2', 'center');
      text('Jace Rook is out of prison and owes Madame Voss one last job — while Detective Kline', CFG.VIEW_W / 2, 352, 16, '#b9c2d4', 'center');
      text('turns the whole harbor against him. Steal cars. Lose the heat. Make the delivery.', CFG.VIEW_W / 2, 376, 16, '#b9c2d4', 'center');
      text('WASD / Arrows — walk & drive      E — enter / exit car      Click / F — shoot', CFG.VIEW_W / 2, 428, 16, '#fff', 'center');
      text('Shift — sprint      M — mute      Esc / P — pause', CFG.VIEW_W / 2, 454, 16, '#fff', 'center');
      const saved = save && save.missionsDone > 0 ? `Continue: ${save.missionsDone} mission${save.missionsDone > 1 ? 's' : ''} done · best cash $${save.bestCash}` : 'A fresh start in the harbor. Three jobs. One way out.';
      text(saved, CFG.VIEW_W / 2, 500, 15, '#ffea00', 'center');
      ctx.font = `bold 24px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(Math.floor(state.time * 2) % 2 === 0 ? '— PRESS ENTER TO START —' : 'PRESS ENTER TO START', CFG.VIEW_W / 2, 566);
      text('Missions: 1 The Pickup · 2 The Getaway · 3 The Harbor Job', CFG.VIEW_W / 2, 612, 14, '#9aa', 'center');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The harbor waits for no one — except right now.', 'Your progress is saved automatically.', ''], 'Press Esc / P to resume', '#00e5ff');
    } else if (screen === SCREEN_OVER) {
      const wasted = state.gameOver === 'wasted';
      drawPanel(wasted ? 'WASTED' : 'BUSTED', [
        wasted ? 'Jace Rook went down in the neon rain.' : 'Detective Kline finally caught up with Jace Rook.',
        `Cash kept: $${state.player.cash} · Missions done: ${state.stats.missionsDone} / 3`,
        'Madame Voss is not pleased. Neither is the harbor.',
      ], 'Press Enter to try again', wasted ? '#ff2e2e' : '#2e7dff');
    }
  }
  return { draw };
}

export function currentMarker(state) {
  if (state.missionDone) return null;
  if (state.missionIndex === 0) return MARKERS.pickup;
  if (state.missionIndex === 1) return state.wanted > 0 ? null : MARKERS.safehouse;
  if (state.missionIndex === 2) return MARKERS.pier;
  return null;
}
