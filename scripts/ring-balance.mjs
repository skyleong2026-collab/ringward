// Ring-balance playtest (§22.7 / §22.10). Stress-tests the NEW economy levers:
//   A. Per-ring stat budget — how hard does Drop's 1.4× multiplier actually swing
//      an even fight? (Isolated: same species, same level, Drop-scaled vs base.)
//   B. The Drop trio's power CURVE vs the standard encounter ladder, across the
//      levels it can now reach (L1 → L10). Are the inherited cores appropriately
//      "solid early, dominant maxed", or do they trivialise / underperform?
//   C. Socket value — does a powered deep-slot gear swing a fight enough to make
//      chasing resonance (waking dormant slots) worth it?
//
// Methodology (per balance-methodology memory): MIXED squads, win% over many
// seeds + both flips (never a single deterministic game; never mono-squad).
// Uses the frozen engine unmodified — this only BUILDS inputs.
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';
import { ringScaledStats, ringLevelCap } from '../src/data/rings.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { levelEnemySquad } from '../src/engine/squad.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 13 + 5);
const pad = (s, n) => String(s).padStart(n);

// A player core: species scaled to its origin ring, at a level (capped by ring).
function core(id, iid, ring, level, extra = {}) {
  const base = c(id);
  return {
    ...base, ...ringScaledStats(base, ring),
    instanceId: iid, id: iid,
    level: Math.min(level, ringLevelCap(ring)),
    originRing: ring, gearId: null, moduleIds: [], ...extra,
  };
}
const trio = (ring, level, extraById = {}) => [
  core('vault', 'a0', ring, level, extraById.vault),
  core('conduit', 'a1', ring, level, extraById.conduit),
  core('striker', 'a2', ring, level, extraById.striker),
];

// Same as core() but with an ARBITRARY budget multiplier (HP/Atk/Armor; speed
// unscaled — mirrors ringScaledStats) so we can sweep candidate Drop values.
function coreMult(id, iid, mult, level, extra = {}) {
  const b = c(id);
  return {
    ...b, hp: Math.round(b.hp * mult), attack: Math.round(b.attack * mult), armor: Math.round(b.armor * mult),
    instanceId: iid, id: iid, level, originRing: 'Drop', gearId: null, moduleIds: [], ...extra,
  };
}
const trioMult = (mult, level) => ['vault', 'conduit', 'striker'].map((id, i) => coreMult(id, 'a' + i, mult, level));

// win% of A vs B over all seeds + both flips (flip swaps sides to cancel
// first-mover bias). A/B are arrays of engine-ready units.
function winRate(A, B) {
  let aw = 0, g = 0;
  for (const seed of SEEDS) for (const flip of [false, true]) {
    const r = flip ? resolveBattle(B, A, seed) : resolveBattle(A, B, seed);
    if (flip ? r.winner === 'B' : r.winner === 'A') aw++;
    g++;
  }
  return Math.round((aw / g) * 100);
}
const verdict = (p) => p >= 65 ? 'A dominant' : p >= 55 ? 'A favored' : p > 45 ? 'even' : p > 35 ? 'B favored' : 'B dominant';

console.log('\n══ A. Per-ring budget swing — Drop (1.4×) vs base, SAME species & level (L5, 1v1) ══\n');
for (const id of ['vault', 'conduit', 'striker', 'spark']) {
  const drop = [core(id, 'a0', 'Drop', 5)];
  const base = [core(id, 'b0', 'Reaches', 5)];
  const p = winRate(drop, base);
  console.log(`  ${pad(c(id).name, 11)}  Drop vs Reaches: ${pad(p + '%', 5)}  (${verdict(p)})`);
}

console.log('\n══ A2. Budget-multiplier SWEEP — find a value that is "favored", not auto-win ══');
console.log('   (scaled-trio vs base-Reaches-trio mirror @ L5; want ~55–65%, not 100%)\n');
const baseTrio = trio('Reaches', 5);
console.log('   ' + ['1.00', '1.10', '1.15', '1.20', '1.30', '1.40'].map((m) => pad(m + '×', 8)).join(''));
const sweep = [1.0, 1.1, 1.15, 1.2, 1.3, 1.4].map((m) => pad(winRate(trioMult(m, 5), baseTrio) + '%', 8));
console.log('   ' + sweep.join(''));

console.log('\n══ B. Drop trio power curve vs the encounter ladder (win% by trio level) ══\n');
const LEVELS = [1, 5, 7, 10];
console.log('  ' + pad('encounter (lvl)', 22) + LEVELS.map((l) => pad('L' + l, 7)).join(''));
for (const enc of ENCOUNTERS) {
  const B = levelEnemySquad(enc.squad, enc.level ?? 1);
  const cells = LEVELS.map((l) => pad(winRate(trio('Drop', l), B) + '%', 7));
  console.log('  ' + pad(`${enc.name} (${enc.level ?? 1})`, 22) + cells.join(''));
}

console.log('\n══ C. Socket value — does a powered deep-slot gear earn the resonance chase? ══');
console.log('   CONTESTED mirror (Drop trio vs identical Drop trio @ L7) so the gear can show.');
console.log('   "starved" = slot dormant (gear dark) → "bloomed" = resonance woke it (gear counts).\n');
const socketTests = [
  ['striker + Quickstrike (extra action on kill)', { striker: { gearId: 'quickstrike' } }],
  ['vault + Lastwall (survive lethal, reflect)',   { vault:   { gearId: 'lastwall' } }],
  ['conduit + Chain Link (echo jumps to a 2nd)',   { conduit: { gearId: 'chainlink' } }],
];
const mirror = trio('Drop', 7);   // the opponent: an even, un-socketed Drop trio
for (const [label, extra] of socketTests) {
  const starved = winRate(trio('Drop', 7), mirror);                 // ~50% baseline (near-mirror)
  const bloomed = winRate(trio('Drop', 7, extra), mirror);          // same trio, gear powered
  console.log(`  ${pad(label, 46)}  starved ${pad(starved + '%', 5)} → bloomed ${pad(bloomed + '%', 5)}  (Δ ${bloomed - starved >= 0 ? '+' : ''}${bloomed - starved})`);
}
console.log('');
