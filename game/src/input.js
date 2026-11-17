// NEON HARBOR — input.js : keyboard + mouse state, edge-triggered presses.
export function createInput(canvas) {
  const keys = {};
  const mouse = { x: 640, y: 360, down: false, clicked: false };
  const pressed = {};
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!e.repeat) pressed[k] = true;
    keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = false;
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  return {
    keys, mouse, pressed,
    down(...names) { return names.some((n) => keys[n]); },
    consume(name) { if (pressed[name]) { pressed[name] = false; return true; } return false; },
    consumeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
    clearPressed() { for (const k in pressed) pressed[k] = false; mouse.clicked = false; },
  };
}
