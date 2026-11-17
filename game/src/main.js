// NEON HARBOR — main.js : boot, loop, screens, save, deterministic screenshots.
// ?seed=N fixes the city. ?shot=cover|street|chase|mission (with &seed=N) stages
// that scene, paints it twice and sets window.__shotReady for a screenshot.
import { CFG, SAVE_KEY } from './config.js';
import { mulberry32, clamp } from './random.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
let world = createWorld(seed);
const renderer = createRenderer(canvas);

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { cash: CFG.START_CASH, missionsDone: 0, bestCash: CFG.START_CASH, missionIndex: 0 };
    const s = JSON.parse(raw);
    return { cash: s.cash || CFG.START_CASH, missionsDone: s.missionsDone || 0, bestCash: s.bestCash || CFG.START_CASH, missionIndex: s.missionIndex || 0 };
  } catch { return { cash: CFG.START_CASH, missionsDone: 0, bestCash: CFG.START_CASH, missionIndex: 0 }; }
}
function writeSave(save) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage off: session only */ }
}
let save = readSave();

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, save);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let savedMission = save.missionIndex;

  function announce(msg) { status.textContent = msg; }
  function applySave() {
    world.state.player.cash = save.cash;
    world.state.missionIndex = Math.min(save.missionIndex, 2);
    world.state.stats.missionsDone = save.missionsDone;
    savedMission = save.missionIndex;
  }
  function persist() {
    save = {
      cash: world.state.player.cash,
      missionsDone: world.state.stats.missionsDone,
      bestCash: Math.max(save.bestCash, world.state.player.cash),
      missionIndex: world.state.missionIndex,
    };
    writeSave(save);
  }
  function startGame() {
    world = createWorld(seed);
    applySave();
    screen = SCREEN_PLAY;
    announce('Neon Harbor. Jace Rook is on the street.');
  }
  function endGame() {
    screen = SCREEN_OVER;
    persist();
    announce(world.state.gameOver === 'busted' ? 'Busted by Harbor PD.' : 'Wasted.');
  }
  function camera() {
    const p = world.state.player;
    return {
      x: clamp(p.x - CFG.VIEW_W / 2, 0, CFG.WORLD_W - CFG.VIEW_W),
      y: clamp(p.y - CFG.VIEW_H / 2, 0, CFG.WORLD_H - CFG.VIEW_H),
    };
  }
  function buildCtl() {
    const k = input.keys, m = input.mouse, cam = camera();
    const p = world.state.player;
    const wx = cam.x + m.x, wy = cam.y + m.y;
    return {
      up: input.down('w', 'arrowup'), down: input.down('s', 'arrowdown'),
      left: input.down('a', 'arrowleft'), right: input.down('d', 'arrowright'),
      sprint: input.down('shift'),
      enter: input.consume('e'),
      shoot: input.consume('f') || input.consumeClick(),
      fireHeld: m.down,
      aimAngle: Math.atan2(wy - p.y, wx - p.x),
    };
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (input.consume('enter') && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) { audio.unlock(); startGame(); }
    else if (input.consume('escape') || input.consume('p')) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    }
    if (input.consume('m')) { const muted = audio.toggleMute(); announce(muted ? 'Muted.' : 'Sound on.'); }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        if (screen === SCREEN_TITLE) {
          world.step(STEP, { up: false, down: false, left: false, right: false, sprint: false, enter: false, shoot: false, fireHeld: false, aimAngle: 0 }, null);
        } else {
          world.step(STEP, buildCtl(), audio);
          if (world.state.gameOver) endGame();
          if (world.state.missionIndex !== savedMission) { savedMission = world.state.missionIndex; persist(); }
        }
        accumulator -= STEP;
      }
    } else accumulator = 0;
    renderer.draw(world.state, screen, save);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  announce('Neon Harbor. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
