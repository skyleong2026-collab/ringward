import { CREATURES } from '../src/data/creatures.js';
import { battle } from '../src/engine/battle.js';
import { battleStepEngine as stepRun } from '../src/engine/battleStepEngine.js';

const c = (id) => CREATURES.find((u) => u.id === id);
const mk = (id, instanceId, gearId) => ({
  ...c(id), instanceId, id: instanceId, level: 1, gearId, moduleIds: [],
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
// Scenarios are chosen to force each trigger.
const scenarios = [
  // glassworkCore: onInit — fires immediately regardless of outcome.
  { id: 'glassworkCore', A: () => [mk('fang', 'a1', 'glassworkCore')], B: () => [mk('vault', 'b1', null)], seed: 3 },
  // mirrorplate: Guardian shield breaks under fire → MIRROR BURST.
  { id: 'mirrorplate', A: () => [mk('vault', 'a1', 'mirrorplate')], B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 5 },
  // killingMomentum: Swift gets a kill → MOMENTUM bonus action.
  { id: 'killingMomentum', A: () => [mk('fang', 'a1', 'killingMomentum'), mk('striker', 'a2', 'killingMomentum')], B: () => [mk('conduit', 'b1', null), mk('link', 'b2', null)], seed: 9 },
  // openChannel: Echo present, a non-Echo ally attacks → chain + empower.
  { id: 'openChannel', A: () => [mk('fang', 'a1', null), mk('conduit', 'a2', 'openChannel')], B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 4 },
  // pyreHeart: Spark falls → PASS THE FLAME.
  { id: 'pyreHeart', A: () => [mk('spark', 'a1', 'pyreHeart')], B: () => [mk('fang', 'b1', null), mk('striker', 'b2', null)], seed: 2 },
];

console.log('\n[launch gear — battleStepEngine]');
for (const s of scenarios) {
  const res = drainStep(s.A(), s.B(), s.seed);
  const ids = gearIdsFrom(res);
  check(`${s.id} proc fires`, ids.has(s.id));
}

console.log('\nRESULT:', pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
