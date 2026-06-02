// Gear-as-power deep-dive — CORRECTED methodology (north-star buildcraft).
//
// HISTORY (kept as a warning): the first version of this harness measured "win%
// of geared squad vs its own bare twin" and concluded gear was LIVE POWER. A later
// pass measured "geared vs a real foe minus bare vs the same foe" and got +0
// everywhere. BOTH were misleading, for the same reason: the frozen engine's
// outcomes are BINARY (a win/loss CLIFF at a power threshold), so any single
// win-rate sample lands in stomp territory (100%/0%) unless it happens to sit
// exactly on the cliff. The bare-twin mirror accidentally sat on a cliff (50%
// coinflip) → gear looked decisive; a real foe sat off it → gear looked dead.
//
// The HONEST metric: gear doesn't make a fixed fight "closer" — it MOVES THE CLIFF.
// So measure how many FOE LEVELS a gear buys: the highest foe level at which the
// squad still wins, geared vs bare. shift = geared_ceiling − bare_ceiling, in
// levels of difficulty. That is gear's real, snowball-proof contribution.
//
// Corollary that ties the two fronts together: a gear's shift only CASHES OUT when
// the fight sits near the cliff (parity). Away from the cliff, every gear is +0 —
// which is why composition-aware matchmaking (fights at parity) is the lever that
// makes ALL buildcraft legible. Frozen engine unmodified — this only builds inputs.
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const u = (id, iid, level, gearId = null, moduleIds = []) => ({ ...c(id), instanceId: iid, id: iid, level, gearId, moduleIds });
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 11 + 3);
const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);

function winRate(S, F) {
  let w = 0, g = 0;
  for (const seed of SEEDS) for (const flip of [false, true]) {
    const r = flip ? resolveBattle(F, S, seed) : resolveBattle(S, F, seed);
    if (flip ? r.winner === 'B' : r.winner === 'A') w++;
    g++;
  }
  return w / g;
}
function countProcs(battleLog, id) {
  let n = 0;
  for (const { events } of battleLog) for (const e of events)
    if ((e.type === 'gear_proc' && e.gearId === id) || (e.type === 'module_proc' && e.moduleId === id)) n++;
  return n;
}
// Highest foe level at which `squad` still wins ≥50% — its difficulty ceiling.
function cliff(squad, foeFn) {
  let last = 0;
  for (let fl = 1; fl <= 16; fl++) if (winRate(squad, foeFn(fl)) >= 0.5) last = fl;
  return last;
}
// procs/game for `gearId` measured at the squad's own cliff level (where it matters).
function procsAtCliff(squad, foeFn, level, gearId) {
  if (level === 0) level = 5;
  const F = foeFn(level);
  let procs = 0, g = 0;
  for (const seed of SEEDS) { procs += countProcs(resolveBattle(squad, F, seed).battleLog, gearId); g++; }
  return +(procs / g).toFixed(1);
}

const PL = 5; // player level fixed; we measure how high a FOE level the squad clears.
const GEAR_OF = {
  Quickstrike: 'quickstrike', 'Killing Momentum': 'killingMomentum', Lastwall: 'lastwall',
  Ironhide: 'ironhide', Mirrorplate: 'mirrorplate', Sentinel: 'sentinel', Kindling: 'kindling',
  Resonator: 'resonator', 'Chain Link': 'chainlink', 'Open Channel': 'openChannel', 'Glasswork Core': 'glassworkCore',
};
// [name, carrier+squad fn (carrier is index 0), foe family]. Foe chosen to put the
// carrier's trigger in play (swifts threaten Guardians; reactors reward focus-kills).
const TESTS = [
  ['Quickstrike',     () => [u('striker', 'p', PL), u('fang', 'f', PL), u('claw', 'k', PL)],   (fl) => [u('spark', 'e0', fl), u('flicker', 'e1', fl), u('cinder', 'e2', fl)]],
  ['Killing Momentum',() => [u('fang', 'p', PL), u('striker', 'f', PL), u('claw', 'k', PL)],    (fl) => [u('spark', 'e0', fl), u('flicker', 'e1', fl), u('cinder', 'e2', fl)]],
  ['Lastwall',        () => [u('vault', 'p', PL), u('conduit', 'f', PL), u('striker', 'k', PL)],(fl) => [u('fang', 'e0', fl), u('striker', 'e1', fl), u('claw', 'e2', fl)]],
  ['Ironhide',        () => [u('vault', 'p', PL), u('bastion', 'f', PL), u('conduit', 'k', PL)],(fl) => [u('fang', 'e0', fl), u('striker', 'e1', fl), u('claw', 'e2', fl)]],
  ['Mirrorplate',     () => [u('vault', 'p', PL), u('bastion', 'f', PL), u('conduit', 'k', PL)],(fl) => [u('fang', 'e0', fl), u('striker', 'e1', fl), u('claw', 'e2', fl)]],
  ['Sentinel',        () => [u('bastion', 'p', PL), u('conduit', 'f', PL), u('striker', 'k', PL)],(fl) => [u('fang', 'e0', fl), u('striker', 'e1', fl), u('claw', 'e2', fl)]],
  ['Kindling',        () => [u('spark', 'p', PL), u('flicker', 'f', PL), u('cinder', 'k', PL)], (fl) => [u('conduit', 'e0', fl), u('link', 'e1', fl), u('nexus', 'e2', fl)]],
  ['Resonator',       () => [u('conduit', 'p', PL), u('striker', 'f', PL), u('fang', 'k', PL)], (fl) => [u('spark', 'e0', fl), u('flicker', 'e1', fl), u('cinder', 'e2', fl)]],
  ['Chain Link',      () => [u('conduit', 'p', PL), u('nexus', 'f', PL), u('striker', 'k', PL)],(fl) => [u('spark', 'e0', fl), u('flicker', 'e1', fl), u('cinder', 'e2', fl)]],
  ['Open Channel',    () => [u('conduit', 'p', PL), u('nexus', 'f', PL), u('striker', 'k', PL)],(fl) => [u('spark', 'e0', fl), u('flicker', 'e1', fl), u('cinder', 'e2', fl)]],
  ['Glasswork Core',  () => [u('bastion', 'p', PL), u('conduit', 'f', PL), u('striker', 'k', PL)],(fl) => [u('spark', 'e0', fl), u('flicker', 'e1', fl), u('cinder', 'e2', fl)]],
];

const tag = (shift) =>
  shift >= 2 ? '◀ strong (+' + shift + ' lvls)' :
  shift === 1 ? 'buys 1 lvl' :
  shift <= -1 ? '🔴 TRAP (' + shift + ' lvls)' :
  'neutral here';

console.log('\n══ CLIFF-SHIFT — how many FOE LEVELS each gear buys (player fixed L5) ══');
console.log('   Gear MOVES the win/loss cliff; it does not make a fixed fight closer.');
console.log('   shift = geared ceiling − bare ceiling. proc/gm sampled at the bare ceiling.\n');
console.log('   ' + padr('gear', 20) + pad('bare', 8) + pad('geared', 9) + pad('shift', 8) + pad('proc/gm', 10) + '  verdict');
for (const [name, sqFn, foe] of TESTS) {
  const gearId = GEAR_OF[name];
  const bareSq = sqFn().map((x) => ({ ...x, gearId: null }));
  const gearSq = sqFn().map((x, i) => (i === 0 ? { ...x, gearId } : x));
  const b = cliff(bareSq, foe);
  const g = cliff(gearSq, foe);
  const pr = procsAtCliff(gearSq, foe, b, gearId);
  console.log('   ' + padr(name, 20) + pad('foe L' + b, 8) + pad('foe L' + g, 9) +
    pad((g - b >= 0 ? '+' : '') + (g - b), 8) + pad(pr, 10) + '  ' + tag(g - b));
}
console.log('\n   Takeaway: gear that buys levels = tempo/focus/survival-at-the-cliff. Traps SPREAD');
console.log('   damage (echo jump) when the cliff fight needs FOCUSED kills. All of it only cashes');
console.log('   out near the cliff — off-cliff every gear is +0, so matchmaking-to-parity is the');
console.log('   lever that makes buildcraft legible.\n');
