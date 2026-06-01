// Gear-as-power deep-dive (north-star buildcraft).
//
// comp-counter.mjs found gear ON vs OFF = Δ0 at parity, and concluded "archetype
// comp is the build axis, gear is sub-threshold". That conclusion is SUSPECT: a
// gear only matters if its TRIGGER fires AND the effect changes an outcome. The
// Δ0 test put gear in matchups where the trigger may never have fired (Quickstrike
// = onKill in a slow Guardian fight = inert). This harness separates the two:
//
//   For each gear, build a MIRROR (identical squad + level, one side geared) in a
//   matchup DESIGNED to fire its trigger, then report BOTH:
//     • proc/game — did the trigger actually fire? (reads battleLog events)
//     • win% of the geared side — given it fired, did it move the outcome?
//
//   procs≈0            → inert in this matchup (trigger never fires)
//   procs>0, win≈50    → fires but cosmetic (snowball swamps it)
//   procs>0, win>>50   → LIVE POWER — gear swings fights when its trigger is live
//
// Mirror baseline is exactly 50% (both sides identical), so any swing is the gear.
// Frozen engine unmodified — this only BUILDS inputs + READS the log.
import { CREATURES } from '../src/data/creatures.js';
import { resolveBattle } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7 + 3);
const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);

// A battle-ready unit at a level, with optional gear/modules.
function u(id, iid, level, gearId = null, moduleIds = []) {
  return { ...c(id), instanceId: iid, id: iid, level, gearId, moduleIds };
}

// Count gear_proc + module_proc events for a given id across the whole log.
function countProcs(battleLog, id) {
  let n = 0;
  for (const { events } of battleLog) {
    for (const e of events) {
      if ((e.type === 'gear_proc' && e.gearId === id) ||
          (e.type === 'module_proc' && e.moduleId === id)) n++;
    }
  }
  return n;
}

// win% of A vs B + avg procs/game of `procId` on A's side, over seeds + both flips.
function measure(A, B, procId) {
  let aw = 0, g = 0, procs = 0;
  for (const seed of SEEDS) for (const flip of [false, true]) {
    const r = flip ? resolveBattle(B, A, seed) : resolveBattle(A, B, seed);
    if (flip ? r.winner === 'B' : r.winner === 'A') aw++;
    procs += countProcs(r.battleLog, procId);
    g++;
  }
  return { win: Math.round((aw / g) * 100), procPerGame: +(procs / g).toFixed(1) };
}

const tag = (win, proc) =>
  proc < 0.2 ? 'INERT (trigger never fires)' :
  win >= 60  ? '◀ LIVE POWER' :
  win >= 54  ? 'fires + tips' :
  'fires but COSMETIC (snowball swamps)';

// ── Each test: a squad + the unit that carries the gear + an opponent built to
// fire the trigger. The geared squad plays vs the SAME squad bare. ──────────────
const L = 5;
const TESTS = [
  {
    gear: 'quickstrike', name: 'Quickstrike (onKill → extra action)',
    squad: () => [u('striker', 'p0', L, 'quickstrike'), u('fang', 'p1', L), u('claw', 'p2', L)],
    bare:  () => [u('striker', 'p0', L), u('fang', 'p1', L), u('claw', 'p2', L)],
    foe:   () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)], // fragile → kills
  },
  {
    gear: 'killingMomentum', name: 'Killing Momentum (onKill → refund + widen)',
    squad: () => [u('fang', 'p0', L, 'killingMomentum'), u('striker', 'p1', L), u('claw', 'p2', L)],
    bare:  () => [u('fang', 'p0', L), u('striker', 'p1', L), u('claw', 'p2', L)],
    foe:   () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)],
  },
  {
    gear: 'lastwall', name: 'Lastwall (onWouldFall → survive + reflect)',
    squad: () => [u('vault', 'p0', L, 'lastwall'), u('conduit', 'p1', L), u('striker', 'p2', L)],
    bare:  () => [u('vault', 'p0', L), u('conduit', 'p1', L), u('striker', 'p2', L)],
    foe:   () => [u('fang', 'e0', L), u('striker', 'e1', L), u('claw', 'e2', L)], // burst → near-death
  },
  {
    gear: 'ironhide', name: 'Ironhide (onShieldBreak → reform)',
    squad: () => [u('vault', 'p0', L, 'ironhide'), u('bastion', 'p1', L), u('conduit', 'p2', L)],
    bare:  () => [u('vault', 'p0', L), u('bastion', 'p1', L), u('conduit', 'p2', L)],
    foe:   () => [u('fang', 'e0', L), u('striker', 'e1', L), u('claw', 'e2', L)],
  },
  {
    gear: 'kindling', name: 'Kindling (onAllyFall → inherit power)',
    squad: () => [u('spark', 'p0', L, 'kindling'), u('flicker', 'p1', L), u('cinder', 'p2', L)],
    bare:  () => [u('spark', 'p0', L), u('flicker', 'p1', L), u('cinder', 'p2', L)],
    foe:   () => [u('fang', 'e0', L), u('striker', 'e1', L), u('claw', 'e2', L)], // kills allies → fires
  },
  {
    gear: 'chainlink', name: 'Chain Link (onEcho → jump to 2nd)',
    squad: () => [u('conduit', 'p0', L, 'chainlink'), u('nexus', 'p1', L), u('striker', 'p2', L)],
    bare:  () => [u('conduit', 'p0', L), u('nexus', 'p1', L), u('striker', 'p2', L)],
    foe:   () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)],
  },
  {
    gear: 'resonator', name: 'Resonator (onEcho → first echo full power)',
    squad: () => [u('conduit', 'p0', L, 'resonator'), u('striker', 'p1', L), u('fang', 'p2', L)],
    bare:  () => [u('conduit', 'p0', L), u('striker', 'p1', L), u('fang', 'p2', L)],
    foe:   () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)],
  },
  {
    gear: 'glassworkCore', name: 'Glasswork Core (onInit → armor→attack)',
    squad: () => [u('bastion', 'p0', L, 'glassworkCore'), u('conduit', 'p1', L), u('striker', 'p2', L)],
    bare:  () => [u('bastion', 'p0', L), u('conduit', 'p1', L), u('striker', 'p2', L)],
    foe:   () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)],
  },
  {
    gear: 'sentinel', name: 'Sentinel (onAllyTargeted → intercept)',
    squad: () => [u('bastion', 'p0', L, 'sentinel'), u('conduit', 'p1', L), u('striker', 'p2', L)],
    bare:  () => [u('bastion', 'p0', L), u('conduit', 'p1', L), u('striker', 'p2', L)],
    foe:   () => [u('fang', 'e0', L), u('striker', 'e1', L), u('claw', 'e2', L)],
  },
  {
    gear: 'mirrorplate', name: 'Mirrorplate (onShieldBreak → reflect burst)',
    squad: () => [u('vault', 'p0', L, 'mirrorplate'), u('bastion', 'p1', L), u('conduit', 'p2', L)],
    bare:  () => [u('vault', 'p0', L), u('bastion', 'p1', L), u('conduit', 'p2', L)],
    foe:   () => [u('fang', 'e0', L), u('striker', 'e1', L), u('claw', 'e2', L)],
  },
  {
    gear: 'openChannel', name: 'Open Channel (onEcho → chain + mark)',
    squad: () => [u('conduit', 'p0', L, 'openChannel'), u('nexus', 'p1', L), u('striker', 'p2', L)],
    bare:  () => [u('conduit', 'p0', L), u('nexus', 'p1', L), u('striker', 'p2', L)],
    foe:   () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)],
  },
  {
    gear: 'pyreHeart', name: 'Pyre Heart (onWouldFall → pass flame + detonate)',
    squad: () => [u('spark', 'p0', L, 'pyreHeart'), u('flicker', 'p1', L), u('cinder', 'p2', L)],
    bare:  () => [u('spark', 'p0', L), u('flicker', 'p1', L), u('cinder', 'p2', L)],
    foe:   () => [u('fang', 'e0', L), u('striker', 'e1', L), u('claw', 'e2', L)],
  },
];

console.log('\n══ GEAR AS POWER — proc rate + win-swing in a MIRROR built to fire each trigger ══');
console.log('   Geared squad vs the SAME squad bare (50% baseline). vs a foe that fires the trigger.\n');
console.log('   ' + padr('gear', 42) + pad('proc/game', 11) + pad('win%', 7) + '   verdict');
for (const t of TESTS) {
  const m = measure(t.squad(), t.bare(), t.gear);
  console.log('   ' + padr(t.name, 42) + pad(m.procPerGame, 11) + pad(m.win + '%', 7) +
    '   ' + tag(m.win, m.procPerGame));
}

// ── Dial test: does a MODULE amplify the verb it tunes? (dial-doctrine) ─────────
console.log('\n══ DIALS — does a module move the geared verb? (gear vs gear+module mirror) ══\n');
const dialTests = [
  ['Quickstrike + Second Wind (fire twice)', 'secondWind',
    () => [u('striker', 'p0', L, 'quickstrike', ['secondWind']), u('fang', 'p1', L), u('claw', 'p2', L)],
    () => [u('striker', 'p0', L, 'quickstrike'), u('fang', 'p1', L), u('claw', 'p2', L)],
    () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)]],
  ['Striker + Deep Cut (wider execute)', 'deepCut',
    () => [u('striker', 'p0', L, 'quickstrike', ['deepCut']), u('fang', 'p1', L), u('claw', 'p2', L)],
    () => [u('striker', 'p0', L, 'quickstrike'), u('fang', 'p1', L), u('claw', 'p2', L)],
    () => [u('spark', 'e0', L), u('flicker', 'e1', L), u('cinder', 'e2', L)]],
  ['Vault + Hardplate (tougher shield)', 'hardplate',
    () => [u('vault', 'p0', L, 'ironhide', ['hardplate']), u('bastion', 'p1', L), u('conduit', 'p2', L)],
    () => [u('vault', 'p0', L, 'ironhide'), u('bastion', 'p1', L), u('conduit', 'p2', L)],
    () => [u('fang', 'e0', L), u('striker', 'e1', L), u('claw', 'e2', L)]],
];
console.log('   ' + padr('dial on top of gear', 42) + pad('proc/game', 11) + pad('win%', 7) + '   (vs gear-only = 50%)');
for (const [label, procId, withDial, without, foe] of dialTests) {
  const m = measure(withDial(), without(), procId);
  console.log('   ' + padr(label, 42) + pad(m.procPerGame, 11) + pad(m.win + '%', 7) +
    '   ' + (m.win >= 54 ? '◀ dial tips it' : m.win <= 46 ? '◀ dial HURTS' : 'no swing'));
}

// ── Robustness: are the inert/cosmetic gears weak EVERYWHERE, or just vs Swifts?
// Re-test the questionable ones across alternate foes + a LONGER fight (higher
// level = more HP = more rounds for slow triggers to matter). ──────────────────
console.log('\n══ ROBUSTNESS — questionable gears across alternate foes (is it the matchup?) ══\n');
const FOES = {
  swifts:   () => [u('fang', 'e0', 7), u('striker', 'e1', 7), u('claw', 'e2', 7)],
  reactors: () => [u('spark', 'e0', 7), u('flicker', 'e1', 7), u('cinder', 'e2', 7)],
  wall:     () => [u('vault', 'e0', 7), u('bastion', 'e1', 7), u('bulwark', 'e2', 7)],
};
const robust = [
  ['ironhide',  () => [u('vault', 'p0', 7, 'ironhide'),  u('bastion', 'p1', 7), u('conduit', 'p2', 7)],
                () => [u('vault', 'p0', 7),               u('bastion', 'p1', 7), u('conduit', 'p2', 7)]],
  ['kindling',  () => [u('spark', 'p0', 7, 'kindling'),   u('flicker', 'p1', 7), u('cinder', 'p2', 7)],
                () => [u('spark', 'p0', 7),               u('flicker', 'p1', 7), u('cinder', 'p2', 7)]],
  ['resonator', () => [u('conduit', 'p0', 7, 'resonator'),u('striker', 'p1', 7), u('fang', 'p2', 7)],
                () => [u('conduit', 'p0', 7),             u('striker', 'p1', 7), u('fang', 'p2', 7)]],
  ['chainlink', () => [u('conduit', 'p0', 7, 'chainlink'),u('nexus', 'p1', 7),   u('striker', 'p2', 7)],
                () => [u('conduit', 'p0', 7),             u('nexus', 'p1', 7),   u('striker', 'p2', 7)]],
];
console.log('   ' + padr('gear', 12) + Object.keys(FOES).map((f) => pad('vs ' + f, 16)).join(''));
for (const [id, geared, bare] of robust) {
  const cells = Object.values(FOES).map((foe) => {
    const m = measure(geared(), bare(), id);
    return pad(`${m.win}% (${m.procPerGame}p)`, 16);
  });
  console.log('   ' + padr(id, 12) + cells.join(''));
}
console.log('\n   (win% of geared mirror | procs/game in parens; 50% = gear changed nothing)');
console.log('');
