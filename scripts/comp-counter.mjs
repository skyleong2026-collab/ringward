// Composition & buildcraft harness (§22.7 / §22.10 / north-star buildcraft).
//
// Two questions the ring-balance harness left open:
//   1. BUILDCRAFT GAP — ring-balance Test C measured gear in a MIRROR and saw Δ0.
//      Wrong test: in a near-mirror the snowball swamps any single proc. The honest
//      test is whether the RIGHT COUNTER-BUILD beats a BRUTE-STAT build of equal
//      level against a STRUCTURED enemy. If counter >> brute, buildcraft DOES decide
//      fights — it's just invisible in mirrors. If counter ≈ brute, the gap is real.
//   2. COMPOSITION MATCHMAKING — combat is binary on comp + size. So "difficulty"
//      is really "did you bring the right tool + enough bodies". Quantify the body
//      disadvantage (player trio = 3, encounters field 3–7) and test whether a
//      composition COUNTER overcomes a body deficit.
//
// Methodology (balance-methodology memory): win% over many seeds + both flips,
// mixed squads, frozen engine unmodified — this only BUILDS inputs.
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';
import { ringScaledStats, ringLevelCap } from '../src/data/rings.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { levelEnemySquad } from '../src/engine/squad.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 13 + 5);
const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);

// A player core: species scaled to its origin ring, at a level (ring-capped).
function core(id, iid, ring, level, extra = {}) {
  const base = c(id);
  return {
    ...base, ...ringScaledStats(base, ring),
    instanceId: iid, id: iid,
    level: Math.min(level, ringLevelCap(ring)),
    originRing: ring, gearId: null, moduleIds: [], ...extra,
  };
}

// win% of A vs B over all seeds + both flips (flip cancels first-mover bias).
function winRate(A, B) {
  let aw = 0, g = 0;
  for (const seed of SEEDS) for (const flip of [false, true]) {
    const r = flip ? resolveBattle(B, A, seed) : resolveBattle(A, B, seed);
    if (flip ? r.winner === 'B' : r.winner === 'A') aw++;
    g++;
  }
  return Math.round((aw / g) * 100);
}
const verdict = (p) => p >= 65 ? 'WIN ' : p >= 55 ? 'fav ' : p > 45 ? 'even' : p > 35 ? 'B-fav' : 'LOSS';

// ── Build kits ────────────────────────────────────────────────────────────────
// A counter squad = the roles that ANSWER an encounter's threat, with the gear +
// module that the role is built around. A brute squad = the three highest-budget
// bodies (ignore composition), no gear. Both at the same ring + level → isolates
// "did the build/comp decide it" from "did raw stats decide it".

// thematic counters keyed by the dominant enemy archetype/threat
const COUNTERS = {
  // vs a Guardian WALL → strip armor (striker/Sunder) + amplify the carry (conduit)
  wall: [
    ['striker', { gearId: 'quickstrike', moduleIds: ['deepCut'] }],
    ['conduit', { gearId: 'resonator',   moduleIds: ['pureTone'] }],
    ['claw',    { gearId: 'killingMomentum', moduleIds: [] }],
  ],
  // vs a Reactor SWARM → blast damper (bulwark/Aegis) + fast execute before they scale
  swarm: [
    ['bulwark', { gearId: 'ironhide', moduleIds: ['hardplate'] }],
    ['fang',    { gearId: 'quickstrike', moduleIds: ['deepCut'] }],
    ['striker', { gearId: 'killingMomentum', moduleIds: ['secondWind'] }],
  ],
  // vs SWIFT execute pressure → a bodyguard wall that eats the burst + sustain
  rush: [
    ['vault',   { gearId: 'lastwall', moduleIds: ['hardplate'] }],
    ['bastion', { gearId: 'sentinel', moduleIds: ['earlyWall'] }],
    ['link',    { gearId: 'resonator', moduleIds: [] }],
  ],
  // vs squishy ECHO amplifiers → burst them down before chains build (Swift rush)
  echo: [
    ['fang',    { gearId: 'quickstrike', moduleIds: ['deepCut'] }],
    ['striker', { gearId: 'killingMomentum', moduleIds: ['secondWind'] }],
    ['claw',    { gearId: 'killingMomentum', moduleIds: [] }],
  ],
};

// brute = the three biggest raw bodies in the roster, no gear, no comp logic.
const BRUTE_IDS = [...CREATURES].sort((a, b) =>
  (b.hp + b.attack + b.armor) - (a.hp + a.attack + a.armor)).slice(0, 3).map((u) => u.id);

function counterSquad(key, ring, level) {
  return COUNTERS[key].map(([id, kit], i) => core(id, 'c' + i, ring, level, kit));
}
function bruteSquad(ring, level) {
  return BRUTE_IDS.map((id, i) => core(id, 'r' + i, ring, level));
}

// ── classify each encounter so we can pick its intended counter automatically ──
function classify(squad) {
  const n = (a) => squad.filter((u) => u.archetype === a).length;
  const g = n('Guardian'), s = n('Spark'), w = n('Swift');
  if (s >= 3) return 'swarm';
  if (g >= 2 && w === 0 && s === 0) return 'wall';
  if (w >= 2 && g === 0) return 'rush';
  if (g >= 2) return 'wall';
  if (w >= 2) return 'rush';
  if (s >= 2) return 'swarm';
  return 'wall'; // balanced default — armor strip + carry is the safe generalist
}

console.log('\nBRUTE squad (highest raw budget, no gear):', BRUTE_IDS.map((id) => c(id).name).join(', '));

// 3-body enemy ARCHETYPES at a chosen level — the structured puzzles the player
// must answer. Built at parity (same ring+level as the player) so neither level
// nor body count decides; only COMP + BUILD differ.
const ENEMY_KINDS = {
  wall:  ['vault', 'bastion', 'bulwark'],   // 3 Guardians — fat HP/armor
  swarm: ['spark', 'flicker', 'cinder'],    // 3 Reactors — scale if the fight goes long
  rush:  ['fang', 'striker', 'claw'],       // 3 Swifts — burst/execute
  echo:  ['conduit', 'nexus', 'link'],      // 3 Echos — amplify
};
const enemyKind = (key, level) =>
  ENEMY_KINDS[key].map((id, i) => core(id, 'k' + i, 'Drop', level));

console.log('\n══ 1. BUILDCRAFT @ PARITY — counter-comp vs brute-comp, 3v3, SAME level ══');
console.log('   vs each enemy ARCHETYPE at L5 (level + body count neutral → only comp/build');
console.log('   differs). If COUNTER >> BRUTE, smart build beats fat stats.\n');
console.log('   ' + padr('enemy archetype', 18) + pad('counter%', 10) + pad('brute%', 9) + '   delta');
let counterWins = 0, total = 0, deltaSum = 0;
for (const key of Object.keys(ENEMY_KINDS)) {
  const B = enemyKind(key, 5);
  const cw = winRate(counterSquad(key, 'Drop', 5), B);
  const bw = winRate(bruteSquad('Drop', 5), B);
  const d = cw - bw;
  deltaSum += d; total++;
  if (cw > bw) counterWins++;
  const flag = d >= 15 ? '  ◀ build matters' : d <= -15 ? '  ◀ brute wins' : '';
  console.log('   ' + padr(key + ' (3-body)', 18) + pad(cw + '%', 10) + pad(bw + '%', 9) +
    '   ' + (d >= 0 ? '+' : '') + d + flag);
}
console.log(`\n   counter beat brute in ${counterWins}/${total} archetypes; avg delta ${(deltaSum / total).toFixed(1)} pts`);

console.log('\n══ 1b. GEAR ISOLATION — same comp, gear ON vs OFF, vs the enemy it answers ══');
console.log('   Striker+Sunder vs a wall; Bulwark+Aegis vs a swarm; etc. Pure proc value.\n');
const gearTests = [
  ['striker armor-strip vs wall',  'wall',  [['striker','c0',{gearId:'quickstrike',moduleIds:['deepCut']}],['conduit','c1',{gearId:'resonator',moduleIds:[]}],['claw','c2',{}]]],
  ['bulwark damper vs swarm',      'swarm', [['bulwark','c0',{gearId:'ironhide',moduleIds:['hardplate']}],['fang','c1',{gearId:'quickstrike',moduleIds:[]}],['striker','c2',{}]]],
  ['wall+sentinel vs rush',        'rush',  [['vault','c0',{gearId:'lastwall',moduleIds:['hardplate']}],['bastion','c1',{gearId:'sentinel',moduleIds:['earlyWall']}],['link','c2',{}]]],
];
for (const [label, enemyKey, kit] of gearTests) {
  const B = enemyKind(enemyKey, 5);
  const geared = kit.map(([id, iid, k]) => core(id, iid, 'Drop', 5, k));
  const bare   = kit.map(([id, iid]) => core(id, iid, 'Drop', 5));
  const gw = winRate(geared, B), bw = winRate(bare, B);
  console.log('   ' + padr(label, 30) + 'gear ' + pad(gw + '%', 5) + '  bare ' + pad(bw + '%', 5) +
    '   (Δ ' + (gw - bw >= 0 ? '+' : '') + (gw - bw) + ')');
}

console.log('\n══ 2. BODY DISADVANTAGE — player trio (3) vs equal-level enemy by SIZE ══');
console.log('   Identical Drop@L7 trio vs N copies of a mid body (bastion) at L7. How many');
console.log('   bodies erase a comp-neutral fight? Quantifies the "3 vs 4+" matchmaking gap.\n');
const trioRef = ['vault', 'conduit', 'striker'].map((id, i) => core(id, 't' + i, 'Drop', 7));
for (const size of [2, 3, 4, 5, 6]) {
  const enemy = Array.from({ length: size }, (_, i) => core('bastion', 'e' + i, 'Drop', 7));
  const p = winRate(trioRef, enemy);
  console.log('   trio (3) vs ' + size + ' bodies:  ' + pad(p + '%', 5) + '  ' + verdict(p));
}

console.log('\n══ 3. COMP vs BODIES — can the right counter overcome a body deficit? ══');
console.log('   Counter trio (3) vs a structured 4-body enemy, vs brute trio (3) vs same.');
console.log('   If counter survives the 3v4 where brute folds, comp > headcount.\n');
const bigEncs = ENCOUNTERS.filter((e) => e.squad.length >= 4);
for (const enc of bigEncs) {
  const B = levelEnemySquad(enc.squad, enc.level ?? 1);
  const key = classify(enc.squad);
  const cw = winRate(counterSquad(key, 'Drop', 7), B);
  const bw = winRate(bruteSquad('Drop', 7), B);
  console.log('   ' + padr(`${enc.name} (${enc.squad.length}-body, ${key})`, 34) +
    'counter ' + pad(cw + '%', 5) + '  brute ' + pad(bw + '%', 5));
}
console.log('');
