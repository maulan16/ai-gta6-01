// NEON HARBOR — audio.js : tiny WebAudio synth, fully guarded (headless-safe).
// v2 visual pass (2026-11-18): audio untouched — only the renderer zooms 2.5x.
export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, muted = false;
  function ensure() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    } catch { return false; }
  }
  function blip(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* ignore */ }
  }
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (engineGain) engineGain.gain.value = muted ? 0 : 0.05; return muted; },
    get muted() { return muted; },
    shot() { blip(880, 0.09, 'square', 0.22, 120); },
    pickup() { blip(520, 0.12, 'sine', 0.2, 980); },
    crash() { blip(90, 0.25, 'sawtooth', 0.25, 40); },
    siren(on) {
      if (muted || !ensure()) return;
      try {
        if (on && !engineOsc) {
          engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
          engineOsc.type = 'sine'; engineOsc.frequency.value = 660;
          engineGain.gain.value = 0.03;
          const lfo = ctx.createOscillator(); lfo.frequency.value = 0.6;
          const lg = ctx.createGain(); lg.gain.value = 220;
          lfo.connect(lg); lg.connect(engineOsc.frequency);
          engineOsc.connect(engineGain); engineGain.connect(master);
          engineOsc.start(); lfo.start();
          engineOsc._lfo = lfo;
        } else if (!on && engineOsc) {
          try { engineOsc._lfo.stop(); engineOsc.stop(); } catch { /* ignore */ }
          engineOsc = null; engineGain = null;
        }
      } catch { /* ignore */ }
    },
    engine(speed01) {
      if (muted || !ensure()) return;
      try {
        if (!engineOsc) {
          engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
          engineGain.gain.value = 0.04;
          engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
        }
        engineOsc.frequency.value = 55 + speed01 * 140;
        engineGain.gain.value = 0.02 + speed01 * 0.05;
      } catch { /* ignore */ }
    },
    engineOff() {
      try { if (engineOsc) { engineOsc.stop(); engineOsc = null; engineGain = null; } } catch { /* ignore */ }
    },
  };
}
