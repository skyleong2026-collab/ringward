import { CREATURES } from '../src/data/creatures.js';
import { battle } from '../src/engine/battle.js';
import { battleStepEngine as stepRun } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const mk = (id, instanceId, gearId, moduleIds = []) => ({
  ...c(id), instanceId, id: instanceId, level: 1, gearId, moduleIds,
});
// Custom dummy for forcing exact kill/threshold scenarios.
const dummy = (instanceId, over = {}) => ({
  id: instanceId, instanceId, name: instanceId, archetype: 'Spark',
  hp: 100, attack: 1, speed: 1, armor: 0, level: 1, gearId: null, moduleIds: [],
  ...over,
});

function drainStep(a, b, seed) {
  const gen = stepRun(a, b, seed);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}
function gearIdsFrom(res) {
  return new Set((res.gearProcs || []).map((p) => p.gearId).filter(Boolean));
}
function moduleIdsFrom(res) {
  const ids = new Set();
  for (const { events } of res.battleLog || []) {
    for (const e of events) if (e.type === 'module_proc' && e.moduleId) ids.add(e.moduleId);
  }
  return ids;
}

let pass = true;
function check(label, cond) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) pass = false;
}

// ── 1. Starters still fire in BOTH engines (regression net for Step 2) ──
{
  const A = () => [mk('fang', 'a1', 'quickstrike'), mk('striker', 'a2', 'quickstrike')];
  const B = () => [mk('vault', 'b1', 'lastwall'), mk('bastion', 'b2', 'lastwall')];
  const r1 = battle(A(), B(), 7);
  const r2 = drainStep(A(), B(), 7);
  console.log('\n[starters]');
  check('battle.js returns gearProcs with ids', r1.gearProcs?.length > 0 && r1.gearProcs.every((p) => p.gearId));
  check('battleStepEngine returns gearProcs with ids', r2.gearProcs?.length > 0 && r2.gearProcs.every((p) => p.gearId));
}

// ── 2. Each launch gear procs in battleStepEngine (canonical engine) ──
const scenarios = [
  { id: 'glassworkCore', A: () => [mk('fang', 'a1', 'glassworkCore')], B: () => [mk('vault', 'b1', null)], seed: 3 },
  { id: 'mirrorplate', A: () => [mk('vault', 'a1', 'mirrorplate')], B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 5 },
  { id: 'killingMomentum', A: () => [mk('fang', 'a1', 'killingMomentum'), mk('striker', 'a2', 'killingMomentum')], B: () => [mk('conduit', 'b1', null), mk('link', 'b2', null)], seed: 9 },
  { id: 'openChannel', A: () => [mk('fang', 'a1', null), mk('conduit', 'a2', 'openChannel')], B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 4 },
  { id: 'pyreHeart', A: () => [mk('spark', 'a1', 'pyreHeart')], B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 2 },
];

console.log('\n[launch gear — battleStepEngine]');
for (const s of scenarios) {
  const res = drainStep(s.A(), s.B(), s.seed);
  const ids = gearIdsFrom(res);
  check(`${s.id} proc fires`, ids.has(s.id));
}

// ── 3. Each dial measurably changes its target behavior (with vs without) ──
// Doctrine check: the dial's proc fires WITH the dial and NOT without it.
const dialTests = [
  // Guardian shield raises in the 50–60% band only with Early Wall.
  { id: 'earlyWall', dial: 'earlyWall',
    A: (m) => [{ ...mk('vault', 'a1', null), moduleIds: m }],
    B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 5 },
  // Guardian shield absorbs more (proc emits on the boosted shield grant).
  { id: 'hardplate', dial: 'hardplate',
    A: (m) => [{ ...mk('vault', 'a1', null), moduleIds: m }],
    B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 5 },
  // Swift executes a target sitting in the 30–42% band only with Deep Cut.
  { id: 'deepCut', dial: 'deepCut',
    A: (m) => [{ ...mk('fang', 'a1', null), moduleIds: m }],
    B: () => [dummy('t1', { archetype: 'Echo', hp: 260, armor: 12, attack: 20, speed: 4 })], seed: 4 },
  // Swift quickstrike chain extends to a 2nd bonus action with Second Wind.
  { id: 'secondWind', dial: 'secondWind',
    A: (m) => [{ ...mk('fang', 'a1', 'quickstrike'), moduleIds: m }],
    B: () => [dummy('d1', { hp: 20 }), dummy('d2', { hp: 20 }), dummy('d3', { hp: 20 })], seed: 1 },
  // Echo chain jumps to a 2nd target with Long Echo.
  { id: 'longEcho', dial: 'longEcho',
    A: (m) => [mk('fang', 'a1', null), { ...mk('conduit', 'a2', 'chainlink'), moduleIds: m }],
    B: () => [dummy('e1', { hp: 300 }), dummy('e2', { hp: 300 }), dummy('e3', { hp: 300 })], seed: 1 },
  // Echo power rises (proc on first echo) with Pure Tone.
  { id: 'pureTone', dial: 'pureTone',
    A: (m) => [mk('fang', 'a1', null), { ...mk('conduit', 'a2', null), moduleIds: m }],
    B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 4 },
  // Spark gains an extra Stoke stack each round with Banked Heat.
  { id: 'bankedHeat', dial: 'bankedHeat',
    A: (m) => [{ ...mk('spark', 'a1', null), moduleIds: m }],
    B: () => [mk('vault', 'b1', null)], seed: 1 },
  // Spark scaling steepens / Pyre widens with Backdraft (proc each round).
  { id: 'backdraft', dial: 'backdraft',
    A: (m) => [{ ...mk('spark', 'a1', 'pyreHeart'), moduleIds: m }],
    B: () => [mk('vault', 'b1', null)], seed: 1 },
  // A once-per-battle survival trigger (lastwall) fires twice with Hair Trigger.
  { id: 'hairTrigger', dial: 'hairTrigger',
    A: (m) => [{ ...dummy('g1', { hp: 60, armor: 0, gearId: 'lastwall' }), moduleIds: m }],
    B: () => [mk('fang', 'b1', null)], seed: 1 },
];

console.log('\n[dials — with vs without]');
for (const t of dialTests) {
  const withDial = moduleIdsFrom(drainStep(t.A([t.dial]), t.B(), t.seed));
  const without = moduleIdsFrom(drainStep(t.A([]), t.B(), t.seed));
  check(`${t.id}: proc fires with dial`, withDial.has(t.dial));
  check(`${t.id}: silent without dial`, !without.has(t.dial));
}

console.log('\nRESULT:', pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
