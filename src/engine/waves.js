// ─── waves.js — the ONE source of truth for run/wave generation + ring laws. ────
// Extracted from SeamLab.jsx (vF-CC) so the live game and the balance sims import the
// SAME code — previously each kept a hand-mirrored copy, a whole class of drift bugs.
// Everything here is RUN-layer (caller-side): the combat engine + goldens never import
// this file, so nothing in it can move a golden transcript.

import { makeUnitDef, COMBAT_CREATURES } from './combat/index.js';

// ─── The eight rings (outer → the Drop). UI fields (img/name/tag) ride along. ───
export const HUNTING_GROUNDS = [
  { id: 'outer-ring',  img: '/art/rings/outer-ring.jpg',  name: 'The Crackling Outer Ring', tag: 'outer ring',     depth: 1, boss: 'The Cinder Maw',  biasIds: ['fizzpop', 'glowtail', 'cinderpaw'] },
  { id: 'fallen-gate', img: '/art/rings/fallen-gate.jpg', name: 'The Fallen Gate',          tag: 'the ruined gate', depth: 2, boss: 'The Gatebreaker', biasIds: ['stoneward', 'ironwall'] },
  { id: 'green-seam',  img: '/art/rings/green-seam.jpg',  name: 'The Green Seam',           tag: 'between the rings', depth: 3, boss: 'The Old Grove',  biasIds: ['mossback', 'dewleaf'] },
  { id: 'storm-wire',  img: '/art/rings/storm-wire.jpg',  name: 'Storm-Wire Thickets',      tag: 'the storm-wire',  depth: 4, boss: 'The Live Wire',   biasIds: ['buzzline', 'tanglewing'] },
  { id: 'fast-trails', img: '/art/rings/fast-trails.jpg', name: 'The Fast Trails',          tag: 'the narrow trails', depth: 5, boss: 'The Blur',       biasIds: ['swiftpaw', 'dartwing'] },
  { id: 'lightless',   img: '/art/rings/lightless.jpg',   name: 'The Lightless Deep',       tag: 'past the Warden', depth: 6, boss: 'The Throat-Cutter', biasIds: ['shadefang', 'veilclaw'] },
  { id: 'witherfen',   img: '/art/rings/witherfen.jpg',   name: 'The Witherfen',            tag: 'where the blight pools', depth: 7, boss: 'The Blight-Heart', biasIds: ['blightcap', 'hexmoth'] },
  { id: 'frostbound',  img: '/art/rings/frostbound.jpg',  name: 'The Frostbound Deep',      tag: 'far inward, near the Drop', depth: 8, boss: 'The Stillness', biasIds: ['frostwarden', 'rimecaller'] },
];

// ─── Difficulty dials (vF-AC concave curve — front-loaded; see RINGWARD-DEPTH-LADDER) ─
export const D_HP = (d) => 1 + 0.34 * (d - 1) - 0.017 * (d - 1) ** 2;  // d1 ×1.0, d3 ×1.61, d8 ×2.55
export const D_ATK = (d) => 1 + 0.30 * (d - 1) - 0.018 * (d - 1) ** 2; // d1 ×1.0, d3 ×1.53, d8 ×2.22
// NG+ "crossing" (vF-BA): each step through the Drop reforms the rings +30% harder.
export const crossMult = (crossing) => 1 + 0.30 * (crossing || 0);

// Kit-threat normalization (vF-CA, sim-calibrated): an enemy's KIT converts the same
// stats into wildly different real threat — unnormalized, the kit DOMINATED the depth
// curve (rings 2-3 free, 5-8 walls). Per-Type ATK coefficients level the locals so
// DEPTH drives difficulty and the kit drives texture. Reactor=1.0 anchors Ring 1
// byte-identical; the boss-wave Tender is a fixed set-piece (no coefficient).
export const KIT_THREAT = { Reactor: 1.0, Bulwark: 2.8, Mender: 2.4, Booster: 1.35, Striker: 0.33, Assassin: 0.34, Hexer: 1.0, Warden: 0.5 };

export function foe(id, temperament, roleHp, roleAtk, depth, extra = {}, cm = 1) {
  const hp = Math.round(roleHp * D_HP(depth) * cm);
  return { ...makeUnitDef(id, temperament), hp, maxHp: hp, atk: Math.round(roleAtk * D_ATK(depth) * cm), ...extra };
}

// Generate a run's four waves from the chosen ring. Enemy IDENTITY (kit/behavior) comes
// from the ring's locals; HP/ATK come from the wave role scaled by depth × crossing.
export function wavesForGround(g, cm = 1) {
  const d = g.depth, pool = g.biasIds, at = (i) => pool[i % pool.length];
  const kt = (id) => KIT_THREAT[COMBAT_CREATURES[id].type] || 1;
  const F = (id, temp, hp, atk, extra) => foe(id, temp, hp, Math.round(atk * kt(id)), d, extra, cm);
  return [
    { name: 'Scouts', seed: 101, blurb: `The edge of ${g.name} — a jumpy pair. Warm up, hit fast.`,
      enemies: () => [ F(at(0), 'Cautious', 110, 26), F(at(1), 'Cautious', 105, 26) ] },
    { name: 'The Pack', seed: 202, blurb: 'Deeper in — three of the locals, and they hit back hard.',
      enemies: () => [ F(at(0), 'Balanced', 175, 40), F(at(1), 'Balanced', 175, 38), F(at(2), 'Balanced', 165, 40) ] },
    { name: 'The Pack-Lord', seed: 303, blurb: 'The two meanest things in here, paired up. Break through.',
      enemies: () => [ F(at(0), 'Greedy', 300, 50), F(at(1), 'Greedy', 220, 62) ] },
    { name: g.boss, boss: true, seed: 404,
      blurb: `The heart of ${g.name} — and something keeps it standing. Race it down, or cut the tender first.`,
      enemies: () => [ F(at(0), 'Greedy', 540, 68, { name: g.boss, speed: 7 }), foe('mossback', 'Balanced', 240, 24, d, { name: 'Tender' }, cm) ] },
  ];
}

// ─── RING LAWS (vF-CC) — one readable combat rule per deep ring. ────────────────
// THE anti-autopilot system: each law is a BUILD QUESTION the ring asks, so the same
// squad can't sleepwalk through all eight. Mechanically every law uses channels the
// engine already has (statuses / charge / run mods) applied AFTER createBattleState —
// the engine itself never knows laws exist, so goldens stay byte-identical.
//   law.line     — the one sentence the player reads (threshold + prep chip)
//   law.ask      — the build question, even shorter (tooltip/whisper)
//   law.mods(m)  — optional: bend the RUN's player mods (e.g. healing halved)
//   law.atStart(state, ctx) — optional: seed statuses/charge on the fresh battle state
// Ring 1 has NO law — the bootstrap ring stays clean.
export const RING_LAWS = {
  'fallen-gate': {
    icon: '🛡', name: 'The Gate Holds',
    line: 'The locals start every fight shielded.',
    ask: 'Bring burn or big hits — chip damage dies on the wall.',
    atStart: (state) => { state.units.B.forEach((u) => { u.statuses.block = Math.round(u.maxHp * 0.15); }); },
  },
  'green-seam': {
    icon: '🌿', name: 'Overgrowth',
    line: 'The locals knit themselves back together — they regenerate.',
    ask: 'Out-pace the healing: burst, curses, or focus fire.',
    atStart: (state) => { state.units.B.forEach((u) => { u.statuses.regen = 4; }); },
  },
  'storm-wire': {
    icon: '⚡', name: 'Live Wires',
    line: 'The locals start every fight amped.',
    ask: 'Their first hits land heavy — guard up or gun them down.',
    atStart: (state) => { state.units.B.forEach((u) => { u.statuses.amp = 1; }); },
  },
  'fast-trails': {
    icon: '🌀', name: 'Coiled',
    line: 'The locals start every fight half-charged.',
    ask: 'Their payoffs come early — survive the opening burst.',
    atStart: (state) => { state.units.B.forEach((u) => { u.charge = Math.min(u.maxCharge, u.charge + 1); }); },
  },
  'lightless': {
    icon: '🎯', name: 'The Dark Marks the Bold',
    line: 'Your hardest hitter enters every fight marked — it takes extra damage.',
    ask: "Protect the carry, or don't bring just one.",
    atStart: (state) => {
      const living = state.units.A.filter((u) => u.alive);
      if (!living.length) return;
      const top = living.reduce((b, u) => (u.atk > b.atk ? u : b), living[0]);
      top.statuses.vuln = 2;
    },
  },
  'witherfen': {
    icon: '🕯', name: 'The Blight Pools',
    line: 'Healing is halved here — wounds keep.',
    ask: 'Sustain crutches fail. Stack HP, or end fights fast.',
    mods: (m) => { m.healMult *= 0.65; },
  },
  'frostbound': {
    icon: '❄', name: 'The Cold Remembers',
    line: 'Creatures you brought last run start every fight chilled.',
    ask: 'The Stillness knows the returning — rotate your squad, or thaw the hard way.',
    atStart: (state, ctx) => {
      const repeat = ctx?.repeatIds;
      if (!repeat || !repeat.size) return;
      state.units.A.forEach((u) => { if (repeat.has(u.id)) u.statuses.freeze = Math.max(u.statuses.freeze || 0, 1); });
    },
  },
};

export const ringLawFor = (ground) => (ground && RING_LAWS[ground.id]) || null;

// Apply a ring's law to a freshly created battle state (no-op for law-less rings).
// ctx: { repeatIds?: Set<creatureId> } — extra inputs some laws read.
export function applyRingLaw(state, ground, ctx = {}) {
  const law = ringLawFor(ground);
  if (law && law.atStart) law.atStart(state, ctx);
}

// Fold a ring's run-level mods into a mod object (no-op for law-less rings).
export function ringLawMods(ground, m) {
  const law = ringLawFor(ground);
  if (law && law.mods) law.mods(m);
  return m;
}
