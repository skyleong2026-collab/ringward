// sfx.js — procedural in-game SFX via Web Audio API.
// No audio files — every sound is synthesized from oscillators + gain envelopes.
// Call sfx.resume() on the first user gesture to unlock the AudioContext (browser
// autoplay policy). After that every function just works.

let _ctx = null;

function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function resume() { ctx(); }

function now() { return ctx().currentTime; }

// Fundamental building block: one oscillator with a linear attack + exponential decay.
function tone(freq, type, start, end, peak, attack = 0.006) {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.001, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.001, end);
  o.start(start); o.stop(end);
}

// Frequency sweep with constant gain → exponential decay.
function sweep(f0, f1, type, dur, peak, delay = 0) {
  const start = now() + delay;
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  g.gain.setValueAtTime(peak, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.start(start); o.stop(start + dur);
}

// ── Combat sounds ──────────────────────────────────────────────────────────

export function chargeUp() {
  // Builder move: crisp rising chirp — energy stored, not released yet
  sweep(260, 430, 'sine', 0.15, 0.2);
  const s = now();
  tone(900, 'sine', s + 0.05, s + 0.12, 0.07, 0.004); // tiny top-end sparkle
}

export function payoff() {
  // Payoff: deep heavy punch — the big release
  const s = now();
  tone(75,  'sine',     s, s + 0.55, 0.42, 0.008);
  tone(50,  'triangle', s, s + 0.55, 0.3,  0.008);
  tone(380, 'sawtooth', s, s + 0.1,  0.14, 0.004); // front-edge crack
}

export function wildcard() {
  // Wildcard: weighty mid-range thud + downward sweep — dynamic, not as big as payoff
  const s = now();
  tone(190, 'triangle', s, s + 0.3, 0.3, 0.007);
  sweep(460, 240, 'sine', 0.22, 0.18);
}

export function shieldAbsorb() {
  // Block absorb: hollow resonant clunk
  const s = now();
  tone(155, 'triangle', s, s + 0.22, 0.28, 0.005);
  tone(310, 'sine',     s, s + 0.1,  0.11, 0.005);
}

export function healLand() {
  // Heal: warm ascending chime — stacked harmonics, hopeful feel
  const s = now();
  tone(440, 'sine', s,        s + 0.38, 0.22, 0.01);
  tone(660, 'sine', s + 0.04, s + 0.34, 0.14, 0.01);
  tone(880, 'sine', s + 0.08, s + 0.28, 0.08, 0.01);
}

export function regenTick() {
  // Regen tick: softer, quicker version of heal
  const s = now();
  tone(528, 'sine', s,        s + 0.18, 0.13, 0.008);
  tone(792, 'sine', s + 0.04, s + 0.18, 0.07, 0.008);
}

export function burnTick() {
  // Burn DoT: sharp fizzing crackle
  sweep(1600, 800, 'sawtooth', 0.1, 0.09);
}

export function ampStack() {
  // Amp applied: rising electric buzz — power loading into an ally
  sweep(280, 680, 'sawtooth', 0.13, 0.13);
  sweep(420, 900, 'sine',     0.12, 0.09, 0.04);
}

// ── Run-phase sounds ────────────────────────────────────────────────────────

export function upgradePick() {
  // Upgrade chosen: clean double-chirp
  const s = now();
  tone(480, 'sine', s,        s + 0.12, 0.2,  0.007);
  tone(720, 'sine', s + 0.09, s + 0.2,  0.18, 0.007);
}

export function waveClear() {
  // Wave cleared: short triumphant 3-note arpeggio — C5, E5, G5
  const s = now();
  [523, 659, 784].forEach((f, i) =>
    tone(f, 'sine', s + i * 0.13, s + i * 0.13 + 0.32, 0.24, 0.01));
}

export function ringTaken() {
  // Run won: ascending 4-note fanfare + sustained chord bloom
  const s = now();
  [523, 659, 784, 1047].forEach((f, i) =>
    tone(f, 'sine', s + i * 0.12, s + i * 0.12 + 0.36, 0.25, 0.01));
  // Chord bloom after the arpeggio lands
  const bloom = s + 4 * 0.12 + 0.06;
  [523, 659, 784, 1047].forEach((f) =>
    tone(f, 'sine', bloom, bloom + 0.9, 0.17, 0.02));
}

export function squadDown() {
  // Run lost: three descending tones — minor, final
  const s = now();
  tone(440, 'sine', s,        s + 0.48, 0.24, 0.01);
  tone(370, 'sine', s + 0.22, s + 0.68, 0.2,  0.01); // minor third down
  tone(294, 'sine', s + 0.44, s + 0.9,  0.17, 0.01); // minor third again
}

export function caughtCreature() {
  // Creature caught: triumphant 5-note ascending fanfare + sparkle on top
  const s = now();
  [392, 523, 659, 784, 1047].forEach((f, i) =>
    tone(f, 'sine', s + i * 0.11, s + i * 0.11 + 0.32, 0.27, 0.01));
  const peak = s + 5 * 0.11;
  tone(1568, 'sine', peak,        peak + 0.42, 0.15, 0.01);
  tone(2093, 'sine', peak + 0.07, peak + 0.42, 0.1,  0.01);
}
