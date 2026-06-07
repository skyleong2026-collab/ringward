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

// ── Node-type stingers (vF-BE) — a distinct sound the moment each kind of stop appears. ──
export function merchantBell() {
  // Merchant: a bright shop-bell ding + warm body.
  const s = now();
  tone(880,  'sine',     s,        s + 0.5,  0.18, 0.004);
  tone(1318, 'sine',     s + 0.01, s + 0.45, 0.1,  0.004);
  tone(660,  'triangle', s + 0.12, s + 0.5,  0.08, 0.01);
}
export function treasureChime() {
  // Treasure: an ascending magical sparkle.
  const s = now();
  [784, 988, 1318, 1568].forEach((f, i) => tone(f, 'sine', s + i * 0.06, s + i * 0.06 + 0.4, 0.12, 0.004));
  tone(2093, 'sine', s + 0.28, s + 0.72, 0.06, 0.004);
}
export function eliteGrowl() {
  // Elite: a low menacing growl + a downward snarl — danger ahead.
  const s = now();
  tone(70,  'sawtooth', s, s + 0.7, 0.22, 0.02);
  tone(105, 'triangle', s, s + 0.6, 0.14, 0.02);
  sweep(300, 90, 'sawtooth', 0.5, 0.12);
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

// ── Story-spine sounds (vF-Z) ────────────────────────────────────────────────

// Crossing into a ring. A low atmospheric swell that sinks DEEPER (lower, longer,
// darker timbre) the further inward you go — the climb sounds heavier near the Drop.
export function ringThreshold(depth = 1) {
  const s = now();
  const t = Math.max(0, Math.min(7, depth - 1)) / 7; // 0 outer → 1 the Drop
  const root = 196 - t * 70;            // G3 at the rim, sinking toward ~C3 deep
  const dur = 1.1 + t * 0.9;            // longer, more cavernous inward
  tone(root,        'triangle', s,        s + dur,       0.22, 0.25);
  tone(root * 1.5,  'sine',     s + 0.05, s + dur * 0.8, 0.12, 0.3);   // a hollow fifth
  tone(root * 2,    'sine',     s + 0.02, s + dur * 0.6, 0.07, 0.2);
  // a thin high shimmer that fades faster the deeper/colder it gets
  if (t < 0.7) tone(root * 6, 'sine', s + 0.08, s + 0.5 + (1 - t) * 0.6, 0.05, 0.1);
}

// THE DROP — the ending theme. A slow, resolving I–vi–IV–V→I in C: tension that
// finally lands. Played once when you clear the final ring and reach the door.
export function theDrop() {
  const c = ctx();
  const s = now();
  // soft master so the layered chords stay warm, not harsh
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, s);
  master.gain.linearRampToValueAtTime(0.9, s + 0.4);
  master.connect(c.destination);
  const chord = (freqs, at, dur, peak) => {
    freqs.forEach((f, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(master);
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.start(at); o.stop(at + dur);
    });
  };
  // C major → A minor → F major → G → resolve to a high, bright C
  chord([130.8, 261.6, 329.6], s,        1.5, 0.18);  // C
  chord([110.0, 261.6, 329.6], s + 1.3,  1.5, 0.18);  // Am
  chord([174.6, 261.6, 349.2], s + 2.6,  1.5, 0.18);  // F
  chord([196.0, 293.7, 392.0], s + 3.9,  1.4, 0.18);  // G
  // the landing — a wide, ringing C major bloom with an octave sparkle on top
  chord([130.8, 261.6, 329.6, 392.0, 523.3], s + 5.1, 3.2, 0.2);
  tone(1046.5, 'sine', s + 5.2, s + 7.5, 0.1, 0.05);
  tone(1568.0, 'sine', s + 5.4, s + 7.2, 0.06, 0.05);
}

// Cutscene page-turn: a soft, low woody knock + breath — turning a page in the tale.
export function sceneTurn() {
  const s = now();
  tone(220, 'sine',     s,        s + 0.18, 0.12, 0.01);
  tone(330, 'triangle', s + 0.02, s + 0.22, 0.07, 0.02);
  sweep(520, 300, 'sine', 0.2, 0.06, 0.01);
}

// ── Ambient pad (vF-Z) — a gentle generative drone for the home screen. ──────
// A slow, low chord that breathes; reschedules itself on a timer. Kept very quiet.
// Lives behind a master gain so it can be faded out cleanly. User-toggled.
let _ambient = null;
export function startAmbient() {
  if (_ambient) return; // already running
  const c = ctx();
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, now());
  master.gain.linearRampToValueAtTime(0.05, now() + 2.5); // ease in, stay subtle
  master.connect(c.destination);
  // a slow wandering pad: pick from a calm Am-ish palette, voice a soft swell
  const palette = [
    [110.0, 164.8, 220.0],   // Am
    [130.8, 196.0, 261.6],   // C
    [146.8, 220.0, 293.7],   // Dm
    [98.0,  146.8, 196.0],   // G
  ];
  let i = 0;
  const swell = () => {
    if (!_ambient) return;
    const freqs = palette[i % palette.length]; i += 1;
    const at = now();
    freqs.forEach((f, k) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(master);
      o.type = k === 0 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f * (k === 2 ? 1.001 : 1), at); // tiny detune shimmer
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.5 / (k + 1), at + 2.4);   // slow attack
      g.gain.exponentialRampToValueAtTime(0.0001, at + 6.5);     // long release
      o.start(at); o.stop(at + 6.8);
    });
  };
  swell();
  const timer = setInterval(swell, 5200); // chords overlap → a continuous wash
  _ambient = { master, timer };
}
export function stopAmbient() {
  if (!_ambient) return;
  const { master, timer } = _ambient;
  clearInterval(timer);
  try { master.gain.exponentialRampToValueAtTime(0.0001, now() + 1.2); } catch { /* best-effort fade */ }
  _ambient = null;
}
export function ambientOn() { return !!_ambient; }
